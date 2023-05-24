import { HttpMethod } from '@vertx/core/options';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { WebClientMgr } from 'es4x-utils/src/network/WebClientMgr';

import { GCPFirestore } from './services/GCPFirestore';
import { GCPTask } from './services/GCPTask';
import { GCPFCMService } from './services/GCPFCMService';
import { GCPPubSubService } from './services/GCPPubSubService';
import { GCPStorageService } from './services/GCPStorageService';


const	configDEV = require('../keys/omni-backend-dev-e0b504c8260d.json');
const	configSTAGING = require('../keys/omni-backend-staging-1bb6a7f02838.json');
const	configPROD = require('../keys/omni-backend-prod-04f4958e8fab.json');
const	rs = require('jsrsasign');


class	GoogleAPI
{
	static	get	PROJECT_DEV()		{ return "omni-backend-dev";	}
	static	get	PROJECT_STAGING()	{ return "omni-backend-staging";	}
	static	get	PROJECT_PROD()		{ return "omni-backend-prod";	}
	static	get	LOCATION_DEV()		{ return "us-central1";	}
	static	get	LOCATION_STAGING()	{ return "us-central1";	}
	static	get	LOCATION_PROD()		{ return "us-central1";	}
	
	constructor(_vertx, _env = "")
	{
		this.__env = _env;
		this.__vertx = _vertx;
		this.__webClient = null;
		this.__tokens = {};

		// services
		this.__firestore = null;
		this.__task = null;
		this.__fcm = null;
		this.__pubsub = null;
		this.__storage = null;
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







	getProjectId(_prodIsStaging = false)
	{
		// PROD?
		if (this.__env == 'production')
		{
			if (_prodIsStaging == true)
				return GoogleAPI.PROJECT_STAGING;
			else
				return GoogleAPI.PROJECT_PROD;
		}
		// STAGING?
		if (this.__env == 'staging')
			return GoogleAPI.PROJECT_STAGING;
		// DEV
		else
			return GoogleAPI.PROJECT_DEV;
	}

	getProjectLocation()
	{
		// PROD?
		if (this.__env == 'production')
			return GoogleAPI.LOCATION_PROD;
		// STAGING?
		if (this.__env == 'staging')
			return GoogleAPI.LOCATION_STAGING;
		// DEV
		else
			return GoogleAPI.LOCATION_DEV;
	}

	getPrivateKey()
	{
		// PROD?
		if (this.__env == 'production')
			return configPROD.private_key;		
		// STAGING?
		if (this.__env == 'staging')
			return configSTAGING.private_key;		
		// DEV
		else
			return configDEV.private_key;		
	}

	getClientEmail()
	{
		// PROD?
		if (this.__env == 'production')
			return configPROD.client_email;		
		// STAGING?
		if (this.__env == 'staging')
			return configSTAGING.client_email;		
		// DEV
		else
			return configDEV.client_email;		
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





	async	getAuthTokenInternal(_scope)
	{
		// this only works in the Google env
		let	envs = ["production", "staging", "development"];
		if (envs.includes(this.__env) == false)
			return null;

		let	timer = DateUtils.Time();

		// get the webclient
		let	webClient = this.getWebClient();

		// GET it
		let	serviceAccount = 'default';
		let result = await webClient.get("metadata.google.internal", "/computeMetadata/v1/instance/service-accounts/" + serviceAccount + "/token?scopes=" + _scope, {
				"Metadata-Flavor": "Google"
		}, true, 80, false);
		if (result.statusCode == 200)
		{
			LogUtils.Log("Google Oauth token INTERNAL retrieved in " + DateUtils.TimeDT(timer) + " sec", result);

			return result.content;
		}
		else
		{
			LogUtils.LogError("Google OAuth INTERNAL Http error: " + result.statusCode, result);
			return null;
		}
	}

	async	getAuthTokenOAuth(_scope)
	{
		let	timer = DateUtils.Time();

		// generate the JWT token for it
		let	jwtToken = this.generateJWTToken(_scope);

		// prepare the content
		let	grantType = "urn:ietf:params:oauth:grant-type:jwt-bearer";
		let	content = "grant_type=" + encodeURIComponent(grantType) + "&assertion=" + jwtToken;

		// get the webclient
		let	webClient = this.getWebClient();

		// POST it
		let result = await webClient.post("oauth2.googleapis.com", "/token", content, {
			"Content-Type": "application/x-www-form-urlencoded"
		}, true, false);

		// is the result good?
		if (result.statusCode == 200)
		{
			LogUtils.Log("Google Oauth token OAUTH retrieved in " + DateUtils.TimeDT(timer) + " sec", result);

			return result.content;
		}
		else
		{
			LogUtils.LogError("Google OAuth Http error: " + result.statusCode, result);
			return null;
		}		
	}

	async	getAuthToken(_scope)
	{
		// do we have a token?
		if (this.__tokens.hasOwnProperty(_scope) == true)
		{
			// is it still valid?
			let	tNow = rs.KJUR.jws.IntDate.get('now');
			if (tNow <= this.__tokens[_scope].expire_at)
			{
				LogUtils.Log("Google Auth token found in cache: " + this.__tokens[_scope].token);
				return this.__tokens[_scope].token;
			}
		}

		let	timer = DateUtils.Time();

		// check internally
		let	tokenData = await this.getAuthTokenInternal(_scope);

		// nothing? check oAuth
		if (tokenData == null)
			tokenData = await this.getAuthTokenOAuth(_scope);

		// do we have it?
		if (tokenData != null)
		{
			// save the token
			this.__tokens[_scope] = {
				"expire_at": rs.KJUR.jws.IntDate.get('now') + tokenData.expires_in - 120,
				"token": tokenData.access_token
			};

			LogUtils.Log("Google Oauth token retrieved in " + DateUtils.TimeDT(timer) + " sec");

			// return it
			return tokenData.access_token;
		}
		else
		{
			LogUtils.LogError("Cannot retrieve the Auth Token :(");
			return null;
		}
	}

	// Generate a JWT token
	// Sources:
	// - https://developers.google.com/identity/protocols/oauth2/service-account#httprest
	// - https://github.com/kjur/jsrsasign
	// - https://github.com/kjur/jsrsasign/blob/master/sample_node/dataencrypt
	generateJWTToken(_scope)
	{
		let	tNow = rs.KJUR.jws.IntDate.get('now');
		let	tEnd = tNow + 3600;

		// prepare the header
		let	header = {
			"alg": "RS256",
			"typ": "JWT"
		};

		// prepare the payload
		let	payload = {
			"iss": "api-helpers@" + this.getProjectId() + ".iam.gserviceaccount.com",
			"scope": _scope,
			"aud": "https://oauth2.googleapis.com/token",
			"iat": tNow,
			"exp": tEnd
		};

		// sign the JWT
		let	sHeader = JSON.stringify(header);
		let	sPayload = JSON.stringify(payload);
		let	sJWT = rs.KJUR.jws.JWS.sign("RS256", sHeader, sPayload, this.getPrivateKey());

		return sJWT;
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
};

module.exports = {
	GoogleAPI
};