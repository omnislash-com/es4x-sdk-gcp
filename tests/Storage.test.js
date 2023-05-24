/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';

import { GoogleAPI } from '../src/GoogleAPI';
const	config = require('./test_config.json');

const suite = TestSuite.create("ES4X Test: Storage");


suite.test("GoogleAPI.storage_rewrite", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		// read the configuration
		let	srcBucket = ObjUtils.GetValueToString(config, "tests.storage.storage_rewrite.source.bucket");
		let	srcObject = ObjUtils.GetValueToString(config, "tests.storage.storage_rewrite.source.path");
		let	destBucket = ObjUtils.GetValueToString(config, "tests.storage.storage_rewrite.destination.bucket");
		let	destObject = ObjUtils.GetValueToString(config, "tests.storage.storage_rewrite.destination.path");

		// do it
		let	result = await googleApi.storage_rewrite(srcBucket, srcObject, destObject, destBucket);

		// test
		context.assertEquals(result, 200);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.test("GoogleAPI.storage_getJSON", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		// read the configuration
		let	bucket = ObjUtils.GetValueToString(config, "tests.storage.storage_getJSON.bucket");
		let	objectPath = ObjUtils.GetValueToString(config, "tests.storage.storage_getJSON.path");

		// do the query
		let	result = await googleApi.storage_getJSON(bucket, objectPath);

		// make sure it's good
		context.assertEquals(result.statusCode, 200);

		// test the content
		let	toTest = ObjUtils.GetValue(config, "tests.storage.storage_getJSON.tests", {});
		for(let path in toTest)
		{
			let	value = ObjUtils.GetValue(result.content, path);
			context.assertEquals(value, toTest[path]);
		}

		// unknown object
		let	unknownPath = ObjUtils.GetValueToString(config, "tests.storage.storage_getJSON.path_to_unknown");
		result = await googleApi.storage_getJSON(bucket, unknownPath);
		context.assertEquals(result.statusCode, 404);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.test("GoogleAPI.storage_setJSON", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		// read the configuration
		let	bucket = ObjUtils.GetValueToString(config, "tests.storage.storage_setJSON.bucket");
		let	objectPath = ObjUtils.GetValueToString(config, "tests.storage.storage_setJSON.folder") + "upload_" + DateUtils.NowToUniqString() + ".json";
		let	objectData = {
			"name": "mike",
			"age": 40,
			"is_female": false,
			"games": ["youriding", "csgo"],
			"friends": {
				"count": 1,
				"list": [
					{
						"name": "matt"
					}
				]
			}
		};

		// do the query
		let	result = await googleApi.storage_setJSON(bucket, objectPath, objectData);

		// make sure it's ok
		context.assertEquals(result, 200);

		// read it again
		result = await googleApi.storage_getJSON(bucket, objectPath);

		// verify the content
		context.assertEquals(result.statusCode, 200);
		context.assertEquals(result.content.name, objectData.name);
		context.assertEquals(result.content.age, objectData.age);
		context.assertEquals(result.content.is_female, objectData.is_female);
		context.assertEquals(result.content.games[0], objectData.games[0]);
		context.assertEquals(result.content.friends.count, objectData.friends.count);
		context.assertEquals(result.content.friends.list[0].name, objectData.friends.list[0].name);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.test("GoogleAPI.storage_generateSignedUrl", async function (context) {

	console.log("=> Test storage_generateSignedUrl");

	// create the google api object
	let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

	// read the configuration
	let	bucket = ObjUtils.GetValueToString(config, "tests.storage.storage_generateSignedUrl.bucket");
	let	targetPath = ObjUtils.GetValueToString(config, "tests.storage.storage_generateSignedUrl.path");

	// generate a signed url to upload
	let	signedUrl = googleApi.storage_generateSignedUrl(bucket, targetPath);

	context.assertNotEquals(signedUrl, "");
});



suite.run();
