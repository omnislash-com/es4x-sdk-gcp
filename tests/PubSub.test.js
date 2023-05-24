/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';

import { GoogleAPI } from '../src/GoogleAPI';
const	config = require('./test_config.json');

const suite = TestSuite.create("ES4X Test: PubSub");


suite.test("GoogleAPI.pubSub_publishMessage", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		// read the configuration
		let	topic = ObjUtils.GetValueToString(config, "tests.pubsub.pubSub_publishMessage.topic");
		let	body = {
			"test": "content"
		}

		// do the query
		let	result = await googleApi.pubSub_publishMessage(topic, body);

		context.assertEquals(result, 200);
		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.run();
