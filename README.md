aws-autoscale-dynamic-tagging
=============================

Generates dynamic tags with auto incrementing numbers for AWS autoscale

In reference to [my blog post](http://distinctplace.com/infrastructure/2013/12/13/aws-autoscale-with-spot-instances-and-dynamic-tagging/)

### For testing

There are couple sample SNS messages that could be useful for testing, make sure to look into those files and adjust to your needs ( instance identifiers and stuff ), or just save some SNS messages yourself.

    cat start_new.sample | curl -H "Content-Type:text/plain" -d @- http://your-host:3000/aws-helper
    cat terminate.sample | curl -H "Content-Type:text/plain" -d @- http://your-host:3000/aws-helper

### Usage

1. Setup SNS topic with HTTP endpoint pointing to your app
2. Run `npm install`
3. Launch aws-helper.js script (somth like `node aws-helper.js`)

**IMPORTANT** - the code assumes you are using IAM roles, so you don't need to specify AWS access keys when you use SDK. If you don't - adjust the code accordingly to pass access and secret keys.
