/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
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

		// read the configuration
		let	queue = ObjUtils.GetValueToString(config, "tests.task.task_create.queue");
		let	method = ObjUtils.GetValueToString(config, "tests.task.task_create.method");
		let url = ObjUtils.GetValueToString(config, "tests.task.task_create.url");
		let	delay = ObjUtils.GetValueToFloat(config, "tests.task.task_create.delay");
		let	body = ObjUtils.GetValue(config, "tests.task.task_create.body");

		// do the query
		let	result = await googleApi.task_create(queue, url, method, body, delay);

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
