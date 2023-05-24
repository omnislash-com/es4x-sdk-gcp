import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { WebClientMgr } from 'es4x-utils/src/network/WebClientMgr';

import { GCPFirestore } from './services/GCPFirestore';
import { GCPTask } from './services/GCPTask';
import { GCPFCMService } from './services/GCPFCMService';
import { GCPPubSubService } from './services/GCPPubSubService';
import { GCPStorageService } from './services/GCPStorageService';
import { GCPAuthService } from './services/GCPAuthService';


class	GoogleAPI
{	
	constructor(_vertx, _location, _key, _isLocal = false)
	{
		this.__isLocal = _isLocal;
		this.__location = _location;
		this.__projectId = ObjUtils.GetValueToString(_key, "project_id");
		this.__privateKey = ObjUtils.GetValueToString(_key, "private_key");
		this.__clientEmail = ObjUtils.GetValueToString(_key, "client_email");

		this.__vertx = _vertx;
		this.__webClient = null;

		// services
		this.__auth = null;
		this.__firestore = null;
		this.__task = null;
		this.__fcm = null;
		this.__pubsub = null;
		this.__storage = null;
	}

	isLocalEnv()
	{
		return this.__isLocal;
	}

	getProjectId()
	{
		return this.__projectId;
	}

	getProjectLocation()
	{
		return this.__location;
	}

	getPrivateKey()
	{
		return this.__privateKey;
	}

	getClientEmail()
	{
		return this.__clientEmail;
	}

	getWebClient()
	{
		// lazy load the web client only when we need it
		if (this.__webClient == null)
		{
			this.__webClient = new WebClientMgr(this.__vertx);
		}

		// return it
		return this.__webClient;		
	}	

	async	query(_query, _returnFullResponse = false)
	{
		// generate the JWT token
		let	token = await this.getAuthToken(_query.scope);
		if (token == null)
		{
			LogUtils.LogError("Error: unauthorized");
			return 401;
		}

		// prepare the headers
		let	headers = {
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		};

		// get the webclient
		let	webClient = this.getWebClient();

		// depending on the method
		LogUtils.Log("- Sending " + _query.method + " request to: " + _query.service + _query.endpoint, {"body": _query.body});
		let	result = await webClient.query(_query.method, _query.service, _query.endpoint, _query.body, headers);

		if (result != null)
			LogUtils.Log("Result = " + result.statusCode, {"request_message": result.statusMessage});

		if (_returnFullResponse == true)
			return result;
		else
			return result.statusCode;
	}








	/******************************
	* 
	*			PubSub
	* 
	******************************/
	getPubSub()
	{
		if (this.__pubsub == null)
		{
			this.__pubsub = new GCPPubSubService(this);
		}

		return this.__pubsub;
	}

	async	pubSub_publishMessage(_topicId, _dataJson)
	{
		return await this.getPubSub().publishMessage(_topicId, _dataJson);
	}

	async	extractPayloadFromPubSub(_postData)
	{
		return GCPPubSubService.ExtractPayload(_postData);
	}



	/******************************
	* 
	*			Firebase FCM
	* 
	******************************/
	getFCM()
	{
		if (this.__fcm == null)
		{
			this.__fcm = new GCPFCMService(this);
		}

		return this.__fcm;
	}

	async	firebase_sendPushNotification(_fcmToken, _title, _body, _image = "", _data = null)
	{
		return await this.getFCM().sendPushNotification(_fcmToken, _title, _body, _image, _data);
	}



	/******************************
	* 
	*			Cloud Task
	* 
	******************************/
	getTask()
	{
		if (this.__task == null)
		{
			this.__task = new GCPTask(this);
		}

		return this.__task;
	}

	async	task_create(_queue, _url, _method, _body, _delaySec = 0)
	{
		return await this.getTask().create(_queue, _url, _method, _body, _delaySec);
	}


	/******************************
	* 
	*			Firestore
	* 
	******************************/
	getFirestore()
	{
		if (this.__firestore == null)
		{
			this.__firestore = new GCPFirestore(this);
		}

		return this.__firestore;
	}

	async	firestore_createDocument(_path, _data, _documentId = "", _databaseId = "(default)")
	{
		return await this.getFirestore().createDocument(_path, _data, _documentId, _databaseId);
	}

	async	firestore_batchWrite(_batchWriteInfo, _databaseId = "(default)")
	{
		return await this.getFirestore().batchWrite(_batchWriteInfo, _databaseId);
	}

	async	firestore_patch(_path, _data, _documentId = "", _databaseId = "(default)")
	{
		return await this.getFirestore().patch(_path, _data, _documentId, _databaseId);
	}

	async	firestore_get(_path, _documentId = "", _databaseId = "(default)")
	{
		return await this.getFirestore().get(_path, _documentId, _databaseId);
	}

	async	firestore_delete(_path, _documentId = "", _databaseId = "(default)")
	{
		return await this.getFirestore().delete(_path, _documentId, _databaseId);
	}

	async	firestore_list(_path, _orderBy = [], _limit = 0, _previousToken = "", _databaseId = "(default)")
	{
		return await this.getFirestore().list(_path, _orderBy, _limit, _previousToken, _databaseId);
	}

	async	firestore_batchGet(_paths, _databaseId = "(default)")
	{
		return await this.getFirestore().batchGet(_paths, _databaseId);
	}


	/******************************
	* 
	*			Auth
	* 
	******************************/
	getAuth()
	{
		if (this.__auth == null)
		{
			this.__auth = new GCPAuthService(this);
		}

		return this.__auth;
	}

	async	getAuthToken(_scope)
	{
		return await this.getAuth().getToken(_scope);
	}



	/******************************
	* 
	*			Storage
	* 
	******************************/
	getStorage()
	{
		if (this.__storage == null)
		{
			this.__storage = new GCPStorageService(this);
		}

		return this.__storage;
	}

	async	storage_getJSON(_bucket, _path, _default = null)
	{
		return await this.getStorage().getJSON(_bucket, _path, _default);
	}

	async	storage_setJSON(_bucket, _path, _content)
	{
		return await this.getStorage().setJSON(_bucket, _path, _content);
	}

	async	storage_rewrite(_srcBucket, _srcPath, _destPath, _destBucket = "")
	{
		return await this.getStorage().rewrite(_srcBucket, _srcPath, _destPath, _destBucket);
	}

	storage_generateSignedUrl(_bucketName, _targetPath, _expiration = 3600, _httpMethod = "PUT")
	{
		return this.getStorage().generateSignedUrl(_bucketName, _targetPath, _expiration, _httpMethod);
	}





};

module.exports = {
	GoogleAPI
};