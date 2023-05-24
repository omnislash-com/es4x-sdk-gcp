/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';


import { GoogleAPI } from '../src/GoogleAPI';
const	config = require('./test_config.json');

const suite = TestSuite.create("ES4X Test: Task");

suite.test("GoogleAPI.task_create", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		let	queue = "notification-sender";
		let	method = "POST";
		let	env = "";
		let url = "https://notification-sender-ibliue6rpa-uc.a.run.app/send";
		let	delay = 60.5;
		let	body = {
			"type": "email",
			"destination": "michael@omnislash.com",
			"message": "forgot_password", 
			"data": {
				"code": "AABBCCDD"
			}
		}

		// change url depending on env
		if (env == "staging")
			url = "https://notification-sender-qsyoovkouq-uc.a.run.app/send";
		else if (env == "production")
			url = "https://notification-sender-z3vhyoqqcq-uc.a.run.app/send";

		console.log("About to send the query...");
		let	result = await googleApi.task_create(queue, url, method, body, delay);
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
