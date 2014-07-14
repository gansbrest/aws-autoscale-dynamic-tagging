
var AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-1'
});

var express = require('express');
var app = express();
var util = require('util');

app.use(function(req, res, next){
  if (req.is('text/*')) {
    req.text = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk){ req.text += chunk; });
    req.on('end', next);
  } else {
    next();
  }
});

/**
 * Make sure to create SNS subscription with this HTTP endpoint
 * */
app.post('/aws-helper', function(req, res){
  if (req.text) {
    req.body = JSON.parse(req.text);
    req.msg = JSON.parse(req.body.Message);

    var instance_id = "";
    if (req.msg.Event == "autoscaling:EC2_INSTANCE_LAUNCH") {
      instance_id = req.msg.EC2InstanceId;
      aws_helper.set_instance_tag(instance_id);
    } else {
      console.log("Some other event for instance " + instance_id + " we don't care about " + req.msg.Event);
    }
  }

  res.send(200);
});

var aws_helper = (function() {
  var obj = {};

  var ec2 = new AWS.EC2();
  var instance_index_map = {};

  /***
  * Reads and returns aws:autoscaling:groupName Tag value
  * for the instance in question
  */
  var get_instance_prefix = function(id, callback) {

    var instances = "",
        tags = "",
        instance_name_prefix = "";

    ec2.describeInstances({
      'InstanceIds': [id]
    }, function (err, data) {
      if (err) {
        console.log(err); // an error occurred
      } else {

        instances = data.Reservations[0].Instances;
        if (instances) {
          instances.forEach(function(instance) {
            tags = instance.Tags;
            if (tags) {
              tags.forEach(function(tag) {
                if (/aws:autoscaling:groupName/i.test(tag.Key)) {
                  callback(tag.Value);
                }
              });
            }
          });
        }
      }
    });
  };
  
  /***
  * Loops through existing list of instances matching the prefix in order
  * to find latest index to increment
  */
  var lookup_index_by_prefix = function(prefix, callback) {

    var instance_index_list = [];

    ec2.describeInstances({
      Filters:[{
          Name:'tag-value',
          Values:[prefix + "*"]
        }, {
          Name:'instance-state-name',
          Values:["running"]
        }
      ]}, function(err,data) {

      if (err) {
        console.log(err);
      }

      data.Reservations.forEach(function(item) {
        item.Instances.forEach(function(instance) {
          instance.Tags.forEach(function(tag) {

            if (tag.Key == 'Name') {
              // Keep only exact matches
              var re = new RegExp(prefix + "-\\d+$", "i");
              if (!re.test(tag.Value)) return;

                var matches = /-(\d+)$/i.exec(tag.Value);
                instance_index_list.push(parseInt(matches[1]));
            }
          });
        });
      });

      instance_index_list.sort(function(a,b) {
        return a - b;
      });
      instance_index_map[prefix] = instance_index_list.pop();
      callback(instance_index_map[prefix]);
    });
  };

  /***
  * Tags particular instance with specified tag_name
  */
  var tag_instance = function(id, tag_name, callback) {
    // Add tags to the instance
    params = {
      Resources: [id],
      Tags: [
        {Key: 'Name', Value: tag_name}
      ]
    };
    ec2.createTags(params, function(err) {
      if (err) {
        console.log("Tagging instance error!!");
      }
      callback(true);
    });
  };

  /***
  * API methods exposed to the client
  */
  obj.set_instance_tag = function(name) {
    get_instance_prefix(name, function(res, err) {
      if (err) {
        return err;
      }

      var prefix = res;
      var next_index = '';

      // Get latest instance index
      lookup_index_by_prefix(prefix, function(res, err) {
        if (err) {
          return err;
        }
        next_index = parseInt(res) + 1;

        // Set name for new box
        tag_instance(name, prefix + "-" + next_index, function(res, err) {
          console.log(util.format('New instance %s was tagged with name %s', name, prefix + "-" + next_index));
        });
      });
    });
  };

  return obj;
}());

app.listen(3000);
