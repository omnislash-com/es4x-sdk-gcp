import { HttpMethod } from '@vertx/core/options';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { WebClientMgr } from 'es4x-utils/src/network/WebClientMgr';

import { GCPFirestore } from './services/GCPFirestore';
import { GCPTask } from './services/GCPTask';
import { GCPFCMService } from './services/GCPFCMService';


const	configDEV = require('../keys/omni-backend-dev-e0b504c8260d.json');
const	configSTAGING = require('../keys/omni-backend-staging-1bb6a7f02838.json');
const	configPROD = require('../keys/omni-backend-prod-04f4958e8fab.json');
const	rs = require('jsrsasign');


class	GoogleAPI
{
	static	get	HOST_PUBSUB()		{ return "pubsub.googleapis.com"; }	
	static	get	HOST_STORAGE()		{ return "storage.googleapis.com"; }	

	static	get	API_VERSION_1()	{ return "v1";	}

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
	}




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







	async	pubSub_publishMessage(_topicId, _dataJson)
	{
		// prepare the body payload
		let	body = {
			"messages": [
				{
					"data": StringUtils.StringToBase64(JSON.stringify(_dataJson)),	// convert to base64
				}
			]
		};

		// prepare the endpoint
		let	endpoint = GoogleAPI.PubSub_GetTopicPath(this.getProjectId(), _topicId) + ":publish";
		let	fullEndpoint = "/" + GoogleAPI.API_VERSION_1 + "/" + endpoint;

		// prepare the query
		let	query = {
			"service": GoogleAPI.HOST_PUBSUB,
			"scope": "https://www.googleapis.com/auth/cloud-platform",
			"endpoint": fullEndpoint,
			"method": HttpMethod.POST,
			"body": body
		};

		// send the query
		return await this.query(query);		
	}

	async	extractPayloadFromPubSub(_postData)
	{
		// get the data field
		let	dataBase64 = ObjUtils.GetValue(_postData, "message.data", "");

		// nothing?
		if (StringUtils.IsEmpty(dataBase64) == true)
		{
			LogUtils.LogError("Base64 data is empty!");
			return null;
		}

		// convert from base64 to string
		let	dataStr = StringUtils.Base64ToString(dataBase64);

		// nothing?
		if (StringUtils.IsEmpty(dataStr) == true)
		{
			LogUtils.LogError("Data is empty!");
			return null;
		}

		// convert to JSON
		let	dataJson = JSON.parse(dataStr);

		return dataJson;
	}

	// https://cloud.google.com/storage/docs/json_api/v1/objects/get
	async	storage_getJSON(_bucket, _path, _default = null)
	{
		// make sure the path doesn't start with '/'
		_path = this.storage_cleanPath(_path);

		// prepare the endpoint
		let	safePath = encodeURIComponent(_path);
		let	endpoint = "/storage/v1/b/" + _bucket + "/o/" + safePath + "?alt=media";

		// prepare the query
		let	query = {
			"service": GoogleAPI.HOST_STORAGE,
			"scope": "https://www.googleapis.com/auth/cloud-platform",
			"endpoint": endpoint,
			"method": HttpMethod.GET
		};

		// send the query
		let	ret = await this.query(query, true);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		let	jsonObject = _default;
		if (errorCodeQuery == 200)
		{
			// parse the content
			let	contentStr = ObjUtils.GetValue(ret, "content", "");
			jsonObject = JSON.parse(contentStr);
		}
		
		return {
			statusCode: errorCodeQuery,
			content: jsonObject
		};
	}

	// https://cloud.google.com/storage/docs/json_api/v1/objects/insert
	async	storage_setJSON(_bucket, _path, _content)
	{
		// make sure the path doesn't start with '/'
		_path = this.storage_cleanPath(_path);

		// prepare the endpoint
		let	safePath = encodeURIComponent(_path);
		let	endpoint = "/upload/storage/v1/b/" + _bucket + "/o?uploadType=media&name=" + safePath;

		// prepare the query
		let	query = {
			"service": GoogleAPI.HOST_STORAGE,
			"scope": "https://www.googleapis.com/auth/cloud-platform",
			"endpoint": endpoint,
			"method": HttpMethod.POST,
			"body": _content
		};

		// send the query
		let	ret = await this.query(query, true);

		// error code?
		return ObjUtils.GetValueToInt(ret, "statusCode");
	}

	// https://cloud.google.com/storage/docs/json_api/v1/objects/rewrite
	async	storage_rewrite(_srcBucket, _srcPath, _destPath, _destBucket = "")
	{
		// make sure we have the dest bucket
		if (StringUtils.IsEmpty(_destBucket) == true)
			_destBucket = _srcBucket;

		// make sure the paths don't start with '/'
		_srcPath = this.storage_cleanPath(_srcPath);
		_destPath = this.storage_cleanPath(_destPath);

		// prepare the endpoint
		let	safeSrcPath = encodeURIComponent(_srcPath);
		let	safeDestPath = encodeURIComponent(_destPath);
		let	endpoint = "/storage/v1/b/" + _srcBucket + "/o/" + safeSrcPath + "/rewriteTo/b/" + _destBucket + "/o/" + safeDestPath;

		// prepare the query
		let	query = {
			"service": GoogleAPI.HOST_STORAGE,
			"scope": "https://www.googleapis.com/auth/cloud-platform",
			"endpoint": endpoint,
			"method": HttpMethod.POST,
			"body": {}
		};

		// we are not done yet
		let	errorCode = 0;
		let	rewriteToken = "";
		while(errorCode == 0)
		{
			// do we need to pass the rewrite token?
			if (StringUtils.IsEmpty(rewriteToken) == false)
			{
				query.endpoint = endpoint + "?rewriteToken=" + rewriteToken;
			}

			// send the query
			let	ret = await this.query(query, true);

			// error code?
			let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
			if (errorCodeQuery != 200)
				errorCode = errorCodeQuery;	// ERROR
			else
			{
				// parse the content
				let	contentStr = ObjUtils.GetValue(ret, "content", "");
				let	contentJSON = JSON.parse(contentStr);// StringUtils.ToJSON(contentStr, true, true, true);

				// let see if we are done
				let	done = ObjUtils.GetValueToBool(contentJSON, "done");
				if (done == true)
					errorCode = 200;
				else
				{
					// do we need to query again?
					rewriteToken = ObjUtils.GetValue(contentJSON, "rewriteToken", "");
					if (StringUtils.IsEmpty(rewriteToken) == true)
						errorCode = 400;	// ERROR
				}
			}
		}

		return errorCode;
	}

	storage_generateSignedUrl(_bucketName, _targetPath, _expiration = 3600, _httpMethod = "PUT")
	{
		// init dates
		let	date = new Date();
		let	datestamp = DateUtils.DateToDateStr(date, "");	// format: YYYYMMDD
		let	requestTimestamp = DateUtils.DateToZuluStr(date, false, "", "T", "");	// format: YYYYMMDD'T'HHMMSS'Z'
		let	credentialScope = datestamp + "/auto/storage/goog4_request";

		// prepare the headers			
		let	host = _bucketName + ".storage.googleapis.com";
		let	headers = {
			host: host
		};
		let	signedHeaders = Object.keys(headers).join(";");

		// build the Canonical request (https://cloud.google.com/storage/docs/authentication/canonical-requests)
		let	canonicalElements = [];

		// - HTTP METHOD
		canonicalElements.push(_httpMethod.toUpperCase());

		// - RESOURCE PATH
		if (_targetPath.startsWith("/") == false)
			_targetPath = "/" + _targetPath;
		canonicalElements.push(_targetPath);
		
		// - QUERY PARAMETERS
		let	queryParameters = {};
		queryParameters["X-Goog-Algorithm"] = 'GOOG4-RSA-SHA256';
		queryParameters["X-Goog-Credential"] = this.getClientEmail() + "/" + credentialScope;
		queryParameters["X-Goog-Date"] = requestTimestamp;
		queryParameters["X-Goog-Expires"] = _expiration;
		queryParameters["X-Goog-SignedHeaders"] = signedHeaders;
		let	queryParametersStr = ObjUtils.SerializeObject(queryParameters);
		canonicalElements.push(queryParametersStr);

		// - HEADERS
		let	headersStr = ObjUtils.SerializeObject(headers, "\n", ":", false) + "\n";
		canonicalElements.push(headersStr);

		// - SIGNED HEADERS
		canonicalElements.push(signedHeaders);

		// - PAYLOAD: UNSIGNED-PAYLOAD
		canonicalElements.push('UNSIGNED-PAYLOAD');

		// generate the canonical string
		let	canonicalRequestStr = canonicalElements.join("\n");

		// create the hashed canonical request
		let	canonicalRequestHash = StringUtils.SHA256(canonicalRequestStr);

		// build the string to sign
		let	stringToSign = [
			'GOOG4-RSA-SHA256',
			requestTimestamp,
			credentialScope,
			canonicalRequestHash
		].join("\n");

		// create the signature
		let	signatureEngine = new rs.KJUR.crypto.Signature({"alg": "SHA256withRSA"});
		signatureEngine.init(this.getPrivateKey());
		let	signature = signatureEngine.signString(stringToSign);

		// build the final URL
		let	signedUrl = "https://" + host + _targetPath + "?" + queryParametersStr + "&x-goog-signature=" + signature;

		return signedUrl;
	}

	storage_cleanPath(_path)
	{
		if (_path.startsWith("/") == true)
			return _path.substr(1);
		else
			return _path;
	}



	static	PubSub_GetTopicPath(_project, _topicId)
	{
		return "projects/" + _project + "/topics/" + _topicId;
	}	
};

module.exports = {
	GoogleAPI
};