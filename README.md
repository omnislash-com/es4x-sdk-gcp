
# Introduction
This library offers a SDK to access Google Cloud Platform services for the [ES4X Runtime](https://github.com/reactiverse/es4x).

Right now some methods have been created to access:
- **Firestore**
- **Firebase FCM** to send Push notifications
- **PubSub**
- **Cloud Task**
- **Cloud Storage**

# Usage
## Add dependency
For now just add the Github url to your dependencies in the **package.json** file:
```
"dependencies": {
	"@vertx/core": "4.1.0",
	"@vertx/web": "4.2.5",
	"@vertx/web-client": "4.2.5",
	"es4x-sdk-gcp": "git+https://github.com/omnislash-com/es4x-sdk-gcp.git#main"
}
```

## Import the GoogleApi class to your code
Import the class directly from the package like this:
```
import { GoogleAPI } from 'es4x-sdk-gcp/src/GoogleAPI';
```

## Create an instance
You only need to create one instance of the controller to access all the services. You do so by doing the following:
```
let	region = "us-central1";
let	authKey = {
		"type": "service_account",
		"project_id": "PROJECTID",
		"private_key_id": "PRIVATEKEYID",
		"private_key": "PRIVATEKEY",
		"client_email": "CLIENTEMAIL",
		"client_id": "CLIENTID",
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://oauth2.googleapis.com/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/api-helpers%40omni-backend-dev.iam.gserviceaccount.com"
	};
let	isLocal = true;	// set this to true when running locally. You can switch to false once it's running in the Cloud
let	googleApi = new GoogleAPI(vertx, region, authKey, isLocal);
```

## Write a JSON document to Cloud Storage
To write some JSON data to Cloud Storage, you can just do the following:
```
let	bucket = "mybucket";
let	objectPath = "/path/to/object/obj.json";
let	dataToWrite = {
	"field": "value"
};
let	result = await googleApi.storage_setJSON(bucket, objectPath, dataToWrite);
if (result == 200)
	console.log("Success!");
```

# Testing
In order to run the tests you need to copy the file:
```
tests/test_config_example.json
```
To
```
tests/test_config.json
```
Then fill is with your Google Cloud account information and test data.
