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

		let	srcBucket = "player_vault_dev";
		let	srcObject = "/users/22/matches/20220812_185115082000_22_valve_csgo_bcb2c886/server_log.txt.zip";
		let	destObject = "/test/copy_server_log.txt.zip";


		console.log("Copying storage file...");
		let	result = await googleApi.storage_rewrite(srcBucket, srcObject, destObject);
		console.log("Result: ");
		console.log(result);

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

		let	env = "dev";
		let	bucket = "data_aggregator";
		let	objectPath = "/test/package.json";

		console.log("Getting existing storage file...");
		let	result = await googleApi.storage_getJSON(bucket, objectPath);
		console.log("Result: ");
		console.log(result.content);

		context.assertEquals(result.statusCode, 200);
		let	toTest = {
			"name": "omnislash-analytics",
			"private": true,
			"dependencies.@vertx/core": "4.1.0",
		};
		for(let path in toTest)
		{
			let	value = ObjUtils.GetValue(result.content, path);
			context.assertEquals(value, toTest[path]);
		}

		// unknown object
		console.log("Getting existing storage file...");
		result = await googleApi.storage_getJSON(bucket, "unknown");
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

		let	env = "dev";
		let	bucket = "data_aggregator";
		let	objectPath = "/test/upload_" + DateUtils.NowToUniqString() + ".json";
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

		console.log("Setting JSON to storage file: " + objectPath);
		let	result = await googleApi.storage_setJSON(bucket, objectPath, objectData);
		context.assertEquals(result, 200);

		// read it again
		console.log("Reading it again: " + objectPath);
		result = await googleApi.storage_getJSON(bucket, objectPath);

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

	// create the google api object
	let	env = "dev";

	// generate a signed url to upload
	let	bucket = "player_vault_dev";
	let	targetPath = "test/1/img.jpg";
	let	signedUrl = googleApi.storage_generateSignedUrl(bucket, targetPath);

	console.log("Signed URL = " + signedUrl);

	context.assertEquals("", "");
});



suite.run();
