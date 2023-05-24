/// <reference types="@vertx/core" />
// @ts-check
import { TestSuite } from '@vertx/unit';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';


import { GoogleAPI } from '../src/GoogleAPI';
import { GCPFirestore } from '../src/services/GCPFirestore';

const suite = TestSuite.create("ES4X Test: Firestore");


suite.test("GoogleAPI.firestore_createDocument", async function (context) {

	let async = context.async();

	try
	{
		let	env = "dev";
		let	testId = "test_" + DateUtils.NowToUniqString();
		let	path = "test/createdocumentid/" + testId;
		let	documentId = StringUtils.GenerateUUID();
		let	data = {
			username: "mikosaure",
			age: 25,
			omniscore: 90.67,
			games: ["youriding", "csgo"],
			is_admin: true,
			friends: [
				{
					user_id: 59,
					username: "cassandra"
				}
			],
			log: {
				yesterday: 25,
				today: 90
			}
		};

		// create the google api object
		let	googleApi = new GoogleAPI(vertx, env);

		console.log("Firestore 1: Create document...");
		let	result = await googleApi.firestore_createDocument(path, data, documentId);
		context.assertEquals(result.statusCode, 200);
		context.assertEquals(result.document_id, documentId);

		// create it again
		console.log("Firestore 2: Create document AGAIN...");
		result = await googleApi.firestore_createDocument(path, data, documentId);
		context.assertEquals(result.statusCode, 409);

		// patch it
		let	toUpdate = {
			age: 40,
			omniscore: 85.90,
			log: {
				yesterday: 25,
				today: 95
			}
		};
		console.log("Firestore 3: patch document...");
		let	statusCode = await googleApi.firestore_patch(path, toUpdate, documentId);
		context.assertEquals(statusCode, 200);

		// get it
		console.log("Firestore 4: get document...");
		let	getResult = await googleApi.firestore_get(path, documentId);
		context.assertEquals(getResult.statusCode, 200);
		context.assertEquals(data.id, documentId);
		context.assertEquals(data.username, getResult.data.username);
		context.assertEquals(toUpdate.age, getResult.data.age);
		context.assertEquals(toUpdate.omniscore, getResult.data.omniscore);
		context.assertEquals(data.is_admin, getResult.data.is_admin);
		context.assertEquals(toUpdate.log.today, getResult.data.log.today);
		context.assertEquals(data.friends[0].user_id, getResult.data.friends[0].user_id);

		// delete it
		console.log("Firestore 5: delete document...");
		statusCode = await googleApi.firestore_delete(path, documentId);
		context.assertEquals(statusCode, 200);

		// get it: error 404
		console.log("Firestore 6: read again...");
		getResult = await googleApi.firestore_get(path, documentId);
		context.assertEquals(getResult.statusCode, 404);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.test("GoogleAPI.firestore_list", async function (context) {

	let async = context.async();

	try
	{
		let	env = "dev";
		let	testId = "test_" + DateUtils.NowToUniqString();
		let	path = "test/list/" + testId;
		let	items = [
			{
				"id": "item_3",
				"created_at": "2022-09-12 17:50:25",
				"name": "item 3",
				"index": 3
			},
			{
				"id": "item_0",
				"created_at": "2022-09-12 17:20:25",
				"name": "item 0",
				"index": 0
			},
			{
				"id": "item_2",
				"created_at": "2022-09-12 17:40:25",
				"name": "item 2",
				"index": 2
			},
			{
				"id": "item_1",
				"created_at": "2022-09-12 17:30:25",
				"name": "item 1",
				"index": 1
			},
		];

		// create the google api object
		let	googleApi = new GoogleAPI(vertx, env);

		// insert all of them
		for(let i=0; i<items.length; i++)
		{
			console.log("Firestore 1: creating document at: " + i);
			let	result = await googleApi.firestore_createDocument(path, items[i], items[i].id);
			context.assertEquals(result.statusCode, 200);
		}

		// list first one by created_at
		console.log("Firestore 2: reading one item with created at");
		let	listRest = await googleApi.firestore_list(path, ["created_at"], 1);
		context.assertEquals(listRest.statusCode, 200);
		context.assertEquals(listRest.documents.length, 1);
		context.assertEquals(listRest.documents[0].index, 0);

		// list first one by created_at
		console.log("Firestore 3: reading all the items");
		listRest = await googleApi.firestore_list(path, ["-created_at"]);
		context.assertEquals(listRest.statusCode, 200);
		context.assertEquals(listRest.documents.length, items.length);
		context.assertEquals(listRest.documents[0].index, 3);
		context.assertEquals(listRest.documents[1].index, 2);
		context.assertEquals(listRest.documents[2].index, 1);
		context.assertEquals(listRest.documents[3].index, 0);

		// batch get
		let	batchIds = [];
		for(let i=0; i<items.length; i++)
		{
			batchIds.push(path + "/" + items[i].id);
		}
		console.log("Firestore 4: reading batch");
		let	batchRet = await googleApi.firestore_batchGet(batchIds);
		context.assertEquals(batchRet.statusCode, 200);
		context.assertEquals(batchRet.documents.length, items.length);

		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});


suite.test("GCPFirestore.Firestore_Batch", async function (context) {

	let async = context.async();

	try
	{
		let	env = "dev";
		let	testId = "test_" + DateUtils.NowToUniqString();
		let	path = "test/list/" + testId;
		console.log("Firestore Batch test: " + path);

		// create the google api object
		let	googleApi = new GoogleAPI(vertx, env);
		
		// init
		let	batchInfo = GCPFirestore.Batch_Init();
		context.assertEquals(batchInfo.create.length, 0);
		context.assertEquals(batchInfo.update.length, 0);
		context.assertEquals(batchInfo.delete.length, 0);

		// test 1: create
		let	toCreate = [
			{
				id: "item_0",
				data: {
					"id": "item_0",
					"created_at": "2022-09-12 17:20:25",
					"name": "item 0",
					"index": 0
				}
			},
			{
				id: "item_1",
				data: {
					"id": "item_1",
					"created_at": "2022-09-13 17:20:25",
					"name": "item 1",
					"index": 1
				}
			},
			{
				id: "item_2",
				data: {
					"id": "item_2",
					"created_at": "2022-09-14 17:20:25",
					"name": "item 2",
					"index": 2
				}
			},				
			{
				id: "",
				data: {
					"created_at": "2022-09-15 17:20:25",
					"name": "item unknown",
					"index": 100
				}
			},
		];

		// create
		for(let todo of toCreate)
		{
			batchInfo = GCPFirestore.Batch_Create(batchInfo, path, todo.data, todo.id);
		}

		// create verify
		context.assertEquals(batchInfo.create.length, toCreate.length);
		context.assertEquals(batchInfo.update.length, 0);
		context.assertEquals(batchInfo.delete.length, 0);
		for(let i=0; i<toCreate.length; i++)
		{
			// empty id?
			if (StringUtils.IsEmpty(toCreate[i].id) == true)
			{
				context.assertEquals(StringUtils.IsEmpty(batchInfo.create[i].id), false);
				context.assertEquals(StringUtils.IsEmpty(batchInfo.create[i].data.id), false);
			}
			else
			{
				context.assertEquals(batchInfo.create[i].id, toCreate[i].id);	
				context.assertEquals(batchInfo.create[i].data.id, toCreate[i].data.id);
			}

			context.assertEquals(batchInfo.create[i].path, path);
			context.assertEquals(batchInfo.create[i].data.name, toCreate[i].data.name);
		}

		// RUN IT
		let	statusCode = await googleApi.firestore_batchWrite(batchInfo);
		context.assertEquals(statusCode, 200);

		// update + create + delete
		batchInfo = GCPFirestore.Batch_Init();
		let	todoNew = {
			create: [
				{
					id: "item_3",
					data: {
						"id": "item_3",
						"created_at": "2022-09-16 17:20:25",
						"name": "item 3",
						"index": 3
					}
				},
				{
					id: "item_4",
					data: {
						"id": "item_4",
						"created_at": "2022-09-17 17:20:25",
						"name": "item 4",
						"index": 4
					}
				},			
			],
			update: [
				{
					id: "item_1",
					data: {
						"id": "item_1",
						"created_at": "2022-10-29 00:00:00",
						"name": "item 1 has changed",
						"index": 27
					}
				},	
				{
					id: "item_2",
					data: {
						"id": "item_2",
						"created_at": "2022-10-30 00:00:00",
						"name": "item 2 has changed",
						"index": 277
					}
				},	
				],
			delete: [
				{
					id: "item_0"
				},
			]
		};

		// create
		for(let todo of todoNew.create)
		{
			batchInfo = GCPFirestore.Batch_Create(batchInfo, path, todo.data, todo.id);
		}

		// update
		for(let todo of todoNew.update)
		{
			batchInfo = GCPFirestore.Batch_Update(batchInfo, path, todo.data, todo.id);
		}

		// delete
		for(let todo of todoNew.delete)
		{
			batchInfo = GCPFirestore.Batch_Delete(batchInfo, path, todo.id);
		}

		// verify the structure
		context.assertEquals(batchInfo.create.length, todoNew.create.length);
		context.assertEquals(batchInfo.update.length, todoNew.update.length);
		context.assertEquals(batchInfo.delete.length, todoNew.delete.length);
		for(let i=0; i<todoNew.create.length; i++)
		{
			// empty id?
			if (StringUtils.IsEmpty(todoNew.create[i].id) == true)
			{
				context.assertEquals(StringUtils.IsEmpty(batchInfo.create[i].id), false);
				context.assertEquals(StringUtils.IsEmpty(batchInfo.create[i].data.id), false);
			}
			else
			{
				context.assertEquals(batchInfo.create[i].id, todoNew.create[i].id);	
				context.assertEquals(batchInfo.create[i].data.id, todoNew.create[i].data.id);
			}

			context.assertEquals(batchInfo.create[i].path, path);
			context.assertEquals(batchInfo.create[i].data.name, todoNew.create[i].data.name);
		}
		for(let i=0; i<todoNew.update.length; i++)
		{
			context.assertEquals(batchInfo.update[i].id, todoNew.update[i].id);	
			context.assertEquals(batchInfo.update[i].path, path);
			context.assertEquals(batchInfo.update[i].data.id, todoNew.update[i].data.id);
			context.assertEquals(batchInfo.update[i].data.name, todoNew.update[i].data.name);
		}	
		for(let i=0; i<todoNew.delete.length; i++)
		{
			context.assertEquals(batchInfo.delete[i].id, todoNew.delete[i].id);	
			context.assertEquals(batchInfo.delete[i].path, path);
		}		

		// RUN IT
		statusCode = await googleApi.firestore_batchWrite(batchInfo);
		context.assertEquals(statusCode, 200);

		// all done
		async.complete();
	}
	catch(e)
	{
		console.trace(e);
		async.complete();
	}
});

suite.test("GCPFirestore.JsonToDocument", async function (context) {

	let	tests = [
		{
			to_convert: "true",
			result: 'stringValue'
		},
		{
			to_convert: "false",
			result: 'stringValue'
		},
		{
			to_convert: true,
			result: 'booleanValue'
		},
		{
			to_convert: false,
			result: 'booleanValue'
		},
	];
	
	for(let i=0; i<tests.length; i++)
	{
		// convert it
		let	value = GCPFirestore.JsonToDocument(tests[i].to_convert);

		let	hasKey = ObjUtils.HasProperty(value, tests[i].result);
		if (hasKey == false)
		{
			console.error("Error: GoogleAPI.Firestore_jsonToDocument(" + i + "): ");
			console.error(value);
		}
		context.assertEquals(hasKey, true);

	}
});

suite.run();
