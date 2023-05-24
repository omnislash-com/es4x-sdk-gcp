import { GCPAbstractService } from './GCPAbstractService';

import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';

const	rs = require('jsrsasign');

class	GCPAuthService	extends GCPAbstractService
{
	constructor(_googleAPI)
	{
		super(_googleAPI);

		this.__tokens = {};
	}

	getHost()
	{
		return "";
	}

	getScope()
	{
		return "";
	}


	async	getInternalToken(_scope)
	{
		// this only works in the Google env
		if (this.isLocalEnv() == true)
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

	async	getOAuthToken(_scope)
	{
		let	timer = DateUtils.Time();

		// generate the JWT token for it
		let	jwtToken = GCPAuthService.GenerateJWTToken(_scope, this.getClientEmail(), this.getPrivateKey());

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

	async	getToken(_scope)
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
		let	tokenData = await this.getInternalToken(_scope);

		// nothing? check oAuth
		if (tokenData == null)
			tokenData = await this.getOAuthToken(_scope);

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
	static	GenerateJWTToken(_scope, _clientEmail, _privateKey)
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
			"iss": _clientEmail,
			"scope": _scope,
			"aud": "https://oauth2.googleapis.com/token",
			"iat": tNow,
			"exp": tEnd
		};

		// sign the JWT
		let	sHeader = JSON.stringify(header);
		let	sPayload = JSON.stringify(payload);
		let	sJWT = rs.KJUR.jws.JWS.sign("RS256", sHeader, sPayload, _privateKey);

		return sJWT;
	}
}

module.exports = {
	GCPAuthService
};