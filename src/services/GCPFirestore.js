import { GCPAbstractService } from './GCPAbstractService';

import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { CoreUtils } from 'es4x-utils/src/utils/CoreUtils';
import { ArrayUtils } from 'es4x-utils/src/utils/ArrayUtils';


class	GCPFirestore	extends GCPAbstractService
{
	constructor(_googleAPI)
	{
		super(_googleAPI);
	}

	getHost()
	{
		return "firestore.googleapis.com";
	}

	getScope()
	{
		return "https://www.googleapis.com/auth/cloud-platform";
	}	


	// https://cloud.google.com/firestore/docs/reference/rest/v1beta1/projects.databases.documents/createDocument
	async	createDocument(_path, _data, _documentId = "", _databaseId = "(default)")
	{
		// make sure the document id is set
		_documentId = GCPFirestore.CreateDocumentId(_documentId);

		// make sure to set the document id
		if (_data.hasOwnProperty("id") == false)
			_data["id"] = _documentId;

		// prepare the document
		let	document = this.createDocumentObject(_path, _data, _documentId, _databaseId);

		// prepare the query
		let	parent = this.parentPath(_path, _databaseId);
		let	endpoint = "/v1/" + parent + "?documentId=" + _documentId;

		// send the query
		let	ret = await this.queryPOST(endpoint, true, document);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		if (errorCodeQuery != 200)
		{
			if (errorCodeQuery == 400)
			{
				console.error("Error creating document:");
				console.error("---------- SOURCE DATA:");
				console.log(_data);
				console.error("---------- GENERATED DATA:")
				console.log(document);
			}

			return {
				statusCode: errorCodeQuery,
				document_id: ""
			};
		}
		else
		{
			return {
				statusCode: 200,
				document_id: _documentId
			};
		}
	}

	// https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/batchWrite
	async	batchWrite(_batchWriteInfo, _databaseId = "(default)")
	{
		// prepare the structure for the batch write
		let	data = {
			writes: [],
			labels: {}
		};

		// create operations
		for(let todo of _batchWriteInfo.create)
		{
			// add the document
			data.writes.push({
				update: this.createDocumentObject(todo.path, todo.data, todo.id, _databaseId, true)
			});
		}

		// update operations
		for(let todo of _batchWriteInfo.update)
		{
			// get the keys to update
			let	keysToUpdate = ObjUtils.Keys(todo.data);
			if (keysToUpdate.length > 0)
			{
				// add the document
				data.writes.push({
					updateMask: {
						fieldPaths: keysToUpdate
					},
					update: this.createDocumentObject(todo.path, todo.data, todo.id, _databaseId, true)
				});
			}
		}
		
		// delete operations
		for(let todo of _batchWriteInfo.delete)
		{
			data.writes.push({
				delete: this.parentPath(todo.path, _databaseId, todo.id)
			});
		}

		// nothing to do?
		if (data.writes.length == 0)
		{
			LogUtils.Log("Batch Write: nothing to save!", _batchWriteInfo);
			return 200;
		}

//		console.log(data);

		// prepare the query
		let	fullPath = this.parentPath("", _databaseId);
		let	endpoint = "/v1/" + fullPath + ":batchWrite";

		// send the query
		let	ret = await this.queryPOST(endpoint, true, data);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		if (errorCodeQuery != 200)
		{
			return errorCodeQuery;
		}
		else
		{
			return 200;
		}
	}

	// https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/patch
	async	patch(_path, _data, _documentId = "", _databaseId = "(default)")
	{
		// get the keys to update
		let	keysToUpdate = ObjUtils.Keys(_data);
		if (keysToUpdate.length == 0)
			return 200;
		
		// prepare the document
		let	document = this.createDocumentObject(_path, _data, _documentId, _databaseId);

		// prepare the query
		let	fullPath = this.parentPath(_path, _databaseId, _documentId);
		let	endpoint = "/v1/" + fullPath + "?";

		// add the update mask
		for(let field of keysToUpdate)
		{
			endpoint += "updateMask.fieldPaths=" + field + "&";
		}

		// send the query
		let	ret = await this.queryPATCH(endpoint, true, document);

		// error code?
		return ObjUtils.GetValueToInt(ret, "statusCode");
	}

	// https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/get
	async	get(_path, _documentId = "", _databaseId = "(default)")
	{
		// prepare the query
		let	fullPath = this.parentPath(_path, _databaseId, _documentId);
		let	endpoint = "/v1/" + fullPath;

		// send the query
		let	ret = await this.queryGET(endpoint, true);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		if (errorCodeQuery != 200)
		{
			return {
				statusCode: errorCodeQuery,
				data: null
			};
		}
		else
		{
			// parse the content
			let	contentStr = ObjUtils.GetValue(ret, "content", "");
			let	contentJSON = JSON.parse(contentStr);// StringUtils.ToJSON(contentStr, true, true, true);

			// extract the object
			let	fields = ObjUtils.GetValue(contentJSON, "fields", {});
			let	documentJson = GCPFirestore.DocumentToJson(fields);
			if (ObjUtils.HasKeys(documentJson) == false)
				documentJson = null;

			return {
				statusCode: 200,
				data: documentJson
			};
		}		
	}

	// https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/delete
	async	delete(_path, _documentId = "", _databaseId = "(default)")
	{
		// prepare the query
		let	fullPath = this.parentPath(_path, _databaseId, _documentId);
		let	endpoint = "/v1/" + fullPath;

		// send the query
		let	ret = await this.queryDELETE(endpoint, true);

		// error code?
		return ObjUtils.GetValueToInt(ret, "statusCode");
	}	

	// https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/list
	async	list(_path, _orderBy = [], _limit = 0, _previousToken = "", _databaseId = "(default)")
	{
		// prepare the query
		let	fullPath = this.parentPath(_path, _databaseId);
		let	endpoint = "/v1/" + fullPath + "?";

		// add the query parameters
		// -- pageToken
		endpoint += "pageToken=" + _previousToken;

		// -- limit
		if (_limit > 0)
			endpoint += "&pageSize=" + _limit.toString();

		// -- order by
		if (_orderBy.length > 0)
		{
			let	orderByFields = [];
			for(let field of _orderBy)
			{
				// DESC?
				if (field.startsWith("-") == true)
				{
					let	fieldBuf = field.substr(1);
					orderByFields.push(fieldBuf + " desc");
				}
				else
				{
					orderByFields.push(field);
				}
			}
			endpoint += "&orderBy=" + encodeURIComponent(orderByFields.join(", "));
		}

		// send the query
		let	ret = await this.queryGET(endpoint, true);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		if (errorCodeQuery != 200)
		{
			return {
				statusCode: errorCodeQuery,
				pageToken: "",
				documents: null
			};
		}
		else
		{
			// parse the content
			let	contentStr = ObjUtils.GetValue(ret, "content", "");
			let	contentJSON = JSON.parse(contentStr);

			// extract the object
			let	allDocuments = ObjUtils.GetValue(contentJSON, "documents", []);
			let	allDocumentsFinal = [];
			for(let document of allDocuments)
			{
				let	fields = ObjUtils.GetValue(document, "fields", {});
				let	documentJson = GCPFirestore.DocumentToJson(fields);
				allDocumentsFinal.push(documentJson);
			}

			return {
				statusCode: 200,
				pageToken: ObjUtils.GetValue(contentJSON, "nextPageToken", ""),
				documents: allDocumentsFinal
			};
		}
	}

	// https://cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/batchGet
	async	batchGet(_paths, _databaseId = "(default)")
	{
		// prepare the query
		let	fullPath = this.parentPath("", _databaseId);
		let	endpoint = "/v1/" + fullPath + ":batchGet";

		let	body = {
			documents: []
		};
		for(let path of _paths)
		{
			body.documents.push(this.parentPath(path, _databaseId));
		}

		// send the query
		let	ret = await this.queryPOST(endpoint, true, body);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		if (errorCodeQuery != 200)
		{
			return {
				statusCode: errorCodeQuery,
				documents: []
			};
		}
		else
		{
			// parse the content
			let	contentStr = ObjUtils.GetValue(ret, "content", "");
			let	contentJSON = JSON.parse(contentStr);

			let	allDocumentsFinal = [];
			if (ArrayUtils.IsEmpty(contentJSON) == false)
			{
				for(let document of contentJSON)
				{
					let	documentFound = ObjUtils.GetValue(document, "found", null);
					if (documentFound != null)
					{
						let	fields = ObjUtils.GetValue(documentFound, "fields", {});
						let	documentJson = GCPFirestore.DocumentToJson(fields);
						allDocumentsFinal.push(documentJson);
					}
				}
			}

			return {
				statusCode: 200,
				documents: allDocumentsFinal
			};
		}
	}

	parentPath(_path, _databaseId = "(default)", _documentId = "")
	{
		let	path = "projects/" + this.getProjectId(true) + "/databases/" + _databaseId + "/documents";
		if (StringUtils.IsEmpty(_path) == false)
			path += "/" + _path;
		if (StringUtils.IsEmpty(_documentId) == false)
			path += "/" + _documentId;
		return path;
	}

	createDocumentObject(_path, _data, _documentId, _databaseId = "(default)", _addName = false)
	{
		// convert the data to firestore object
		let	convertedData = GCPFirestore.JsonToDocument(_data);

		// create the document
		let	document = {
			fields: ObjUtils.GetValue(convertedData, "mapValue.fields", {})
		};

		// add the name (path)?
		if (_addName == true)
		{
			document.name = this.parentPath(_path, _databaseId, _documentId);
		}

		return document;
	}


	static	CreateDocumentId(_documentId = "")
	{
		if (StringUtils.IsEmpty(_documentId) == true)
			_documentId = StringUtils.GenerateUUID();
		return _documentId;
	}

	static	JsonToDocument(_value)
	{
		if (typeof _value == 'boolean')
		{
			return { 'booleanValue': _value };
		}
		else if (_value && _value.constructor === Array)
		{
			return { 'arrayValue': { values: _value.map(v => GCPFirestore.JsonToDocument(v)) } };
		}
		else if (typeof _value === 'object')
		{
			let obj = {};
			for (let o in _value)
			{
				obj[o] = GCPFirestore.JsonToDocument(_value[o]);
			}
			return { 'mapValue': { fields: obj } };
		}		
		else if (typeof _value === 'string')
		{
			// is it a date?
			if (DateUtils.IsDate(_value) == true)
			{
				return { 'timestampValue': DateUtils.DateToZuluStr(DateUtils.ParseToDate(_value)) };
			}

			// just a string
			return { 'stringValue': _value };
		}
		else if (isNaN(_value) == false)
		{
			if (_value.toString().indexOf('.') != -1)
				return { 'doubleValue': _value };
			else
				return { 'integerValue': _value };
		}
		else if (Date.parse(_value))
		{
			return { 'timestampValue': DateUtils.DateToZuluStr(DateUtils.ParseToDate(_value)) };
		}
		else
		{
			return { 'stringValue': _value.toString() };
		}
	}

	static	DocumentToJson(_fields)
	{
		let result = {};
		for (let f in _fields)
		{
			let key = f, value = _fields[f],
				isDocumentType = ['stringValue', 'booleanValue', 'doubleValue',
					'integerValue', 'timestampValue', 'mapValue', 'arrayValue'].find(t => t === key);
			if (isDocumentType)
			{
				let item = ['stringValue', 'booleanValue', 'doubleValue', 'integerValue', 'timestampValue']
					.find(t => t === key)
				if (item)
				{
					if (key == "integerValue")
						return StringUtils.ToInt(value);
					return value;
				}
				else if ('mapValue' == key)
					return GCPFirestore.DocumentToJson(value.fields || {});
				else if ('arrayValue' == key)
				{
					let list = value.values;
					return !!list ? list.map(l => GCPFirestore.DocumentToJson(l)) : [];
				}
			}
			else
			{
				result[key] = GCPFirestore.DocumentToJson(value)
			}
		}
		return result;
	}

	static	Batch_Create(_batchWriteInfo, _path, _data, _documentId = "")
	{
		// make sure we have the batch write info
		if (CoreUtils.IsValid(_batchWriteInfo) == false)
			_batchWriteInfo = GCPFirestore.Batch_Init();

		// make sure the document id is set
		_documentId = GCPFirestore.CreateDocumentId(_documentId);

		// make sure to set the document id
		if (_data.hasOwnProperty("id") == false)
			_data["id"] = _documentId;

		// add it to our list
		_batchWriteInfo["create"].push({
			path: _path,
			id: _documentId,
			data: _data
		});

		return _batchWriteInfo;
	}

	static	Batch_Update(_batchWriteInfo, _path, _data, _documentId = "")
	{
		// make sure we have the batch write info
		if (CoreUtils.IsValid(_batchWriteInfo) == false)
			_batchWriteInfo = GCPFirestore.Batch_Init();

		// add it to our list
		_batchWriteInfo["update"].push({
			path: _path,
			id: _documentId,
			data: _data
		});

		return _batchWriteInfo;
	}

	static	Batch_Delete(_batchWriteInfo, _path, _documentId = "")
	{
		// make sure we have the batch write info
		if (CoreUtils.IsValid(_batchWriteInfo) == false)
			_batchWriteInfo = GCPFirestore.Batch_Init();

		// add it to our list
		_batchWriteInfo["delete"].push({
			path: _path,
			id: _documentId
		});

		return _batchWriteInfo;
	}	

	static	Batch_Init()
	{
		return {
			update: [],
			create: [],
			delete: []
		};
	}

}

module.exports = {
	GCPFirestore
};