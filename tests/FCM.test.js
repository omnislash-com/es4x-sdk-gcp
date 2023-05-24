/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';

import { GoogleAPI } from '../src/GoogleAPI';

const suite = TestSuite.create("ES4X Test: FCM");
const	config = require('./test_config.json');

suite.test("GoogleAPI.firebase_sendPushNotification", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		let	env = "dev";
		let	fcmToken = "cvEC8vARJ0ElhERTSgaKXt:APA91bHM2ORdTcMamnSxaGbWdshKk4QoOXsWfMlzGu4EA_Dlsd_w8y_qX3hVWN-ixG1x3VbHlzuq1xy8jDtXeMhEQceT67LvZLyBxg3R5QiD7eWomXbmA1Vf7OrXgI7kqtDvZuhoM5B4";
		let	title = "jasmine2 liked your post";
		let	description = "Click to see your notifications";
		let	image = "https://res.cloudinary.com/omnislashtech/image/upload/c_thumb,g_face,w_100,h_100/prod/users/1/profile/profile_1670026483004";
		let	data = {
			"user_id": "243",
			"target.user_id": "239",
			"target.post_id": "2429",
			"target.post_info.id": "2429",
			"target.post_info.created_at": "2021-10-26T16:34:37.070302Z",
			"target.post_info.text": "?? idk\n ",
		};

		console.log("About to send the query...");
		let	result = await googleApi.firebase_sendPushNotification(fcmToken, title, description, image, data);
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


suite.run();
