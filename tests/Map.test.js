/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';

import { GoogleAPI } from '../src/GoogleAPI';
const	config = require('./test_config.json');

const suite = TestSuite.create("ES4X Test: Map");


suite.test("GoogleAPI.map_geocode", async function (context) {

	let async = context.async();

	try
	{
		// create the google api object
		let	googleApi = new GoogleAPI(vertx, config.region, config.key, true);

		// tests
		let	tests = ObjUtils.GetValue(config, "tests.map");
		
		for(let i=0; i<tests.length; i++)
		{
			// get the info
			let	result = await googleApi.map_geocode(tests[i].address);

			// compare
			console.log(result);

			context.assertNotNull(result);
		}

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.run();
