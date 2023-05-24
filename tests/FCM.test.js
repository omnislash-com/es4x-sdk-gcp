/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';

import { GoogleAPI } from '../src/GoogleAPI';

const suite = TestSuite.create("ES4X Test: FCM");
const	config = require('./test_config.json');

suite.test("GoogleAPI.firebase_sendPushNotification", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		// read the configuration
		let	fcmToken = ObjUtils.GetValueToString(config, "tests.fcm.firebase_sendPushNotification.fcm_token");
		let	title = ObjUtils.GetValueToString(config, "tests.fcm.firebase_sendPushNotification.title");
		let	description = ObjUtils.GetValueToString(config, "tests.fcm.firebase_sendPushNotification.description");
		let	image = ObjUtils.GetValueToString(config, "tests.fcm.firebase_sendPushNotification.image");
		let	data = ObjUtils.GetValue(config, "tests.fcm.firebase_sendPushNotification.data", {});

		// do the query
		let	result = await googleApi.firebase_sendPushNotification(fcmToken, title, description, image, data);

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
