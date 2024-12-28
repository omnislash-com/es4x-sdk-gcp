import { GCPAbstractService } from './GCPAbstractService';

import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
const	rs = require('jsrsasign');

class	GCPStorageService	extends GCPAbstractService
{
	static	get	API_VERSION()	{ return "v1";	}

	constructor(_googleAPI)
	{
		super(_googleAPI);
	}

	getHost()
	{
		return "storage.googleapis.com";
	}

	getScope()
	{
		return "https://www.googleapis.com/auth/cloud-platform";
	}




	// https://cloud.google.com/storage/docs/json_api/v1/objects/get
	async	getJSON(_bucket, _path, _default = null)
	{
		// make sure the path doesn't start with '/'
		_path = GCPStorageService.CleanPath(_path);

		// prepare the endpoint
		let	safePath = encodeURIComponent(_path);
		let	endpoint = "/storage/" + GCPStorageService.API_VERSION + "/b/" + _bucket + "/o/" + safePath + "?alt=media";

		// send the query
		let	ret = await this.queryGET(endpoint, true);

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
	async	setJSON(_bucket, _path, _content, _contentType = "application/json")
	{
		// make sure the path doesn't start with '/'
		_path = GCPStorageService.CleanPath(_path);

		// prepare the endpoint
		let	safePath = encodeURIComponent(_path);
		let	endpoint = "/upload/storage/" + GCPStorageService.API_VERSION + "/b/" + _bucket + "/o?uploadType=media&name=" + safePath;

		// send the query
		let	ret = await this.queryPOST(endpoint, true, _content, _contentType);

		// error code?
		return ObjUtils.GetValueToInt(ret, "statusCode");
	}

	// https://cloud.google.com/storage/docs/json_api/v1/objects/rewrite
	async	rewrite(_srcBucket, _srcPath, _destPath, _destBucket = "")
	{
		// make sure we have the dest bucket
		if (StringUtils.IsEmpty(_destBucket) == true)
			_destBucket = _srcBucket;

		// make sure the paths don't start with '/'
		_srcPath = GCPStorageService.CleanPath(_srcPath);
		_destPath = GCPStorageService.CleanPath(_destPath);

		// prepare the endpoint
		let	safeSrcPath = encodeURIComponent(_srcPath);
		let	safeDestPath = encodeURIComponent(_destPath);
		let	endpoint = "/storage/" + GCPStorageService.API_VERSION + "/b/" + _srcBucket + "/o/" + safeSrcPath + "/rewriteTo/b/" + _destBucket + "/o/" + safeDestPath;

		// we are not done yet
		let	errorCode = 0;
		let	rewriteToken = "";
		let	finalEndpoint = endpoint;
		while(errorCode == 0)
		{
			// do we need to pass the rewrite token?
			if (StringUtils.IsEmpty(rewriteToken) == false)
			{
				finalEndpoint = endpoint + "?rewriteToken=" + rewriteToken;
			}

			// send the query
			let	ret = await this.queryPOST(finalEndpoint, true, {});

			// error code?
			let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
			if (errorCodeQuery != 200)
				errorCode = errorCodeQuery;	// ERROR
			else
			{
				// parse the content
				let	contentStr = ObjUtils.GetValue(ret, "content", "");
				let	contentJSON = JSON.parse(contentStr);

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

	generateSignedUrl(_bucketName, _targetPath, _expiration = 3600, _httpMethod = "PUT")
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

	static	CleanPath(_path)
	{
		if (_path.startsWith("/") == true)
			return _path.substr(1);
		else
			return _path;
	}


	async deleteObject(_bucketName, _targetPath) {
		try {
			// Make sure the path doesn't start with '/'
			_targetPath = GCPStorageService.CleanPath(_targetPath);
	
			// Prepare the endpoint
			let safePath = encodeURIComponent(_targetPath);
			let endpoint = `/storage/${GCPStorageService.API_VERSION}/b/${_bucketName}/o/${safePath}`;
	
			// Send the DELETE request
			let ret = await this.queryDELETE(endpoint, true);
	
			// Extract status code
			let statusCode = ObjUtils.GetValueToInt(ret, "statusCode");
	
			// Return response similar to Firestore
			return {
				status: statusCode,
				message: statusCode === 200 ? "Object deleted successfully" : "Error deleting object"
			};
		} catch (error) {
			// Handle any errors
			console.error("Error deleting object:", error);
			return {
				status: 500,
				message: "Internal Server Error"
			};
		}
	}	
}

module.exports = {
	GCPStorageService
};