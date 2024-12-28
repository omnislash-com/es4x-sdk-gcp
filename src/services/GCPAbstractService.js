import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { QueryUtils } from 'es4x-utils/src/network/QueryUtils';


class	GCPAbstractService
{
	constructor(_googleAPI)
	{
		this.__api = _googleAPI;
	}

	getProjectId()
	{
		return this.__api.getProjectId();
	}

	getProjectLocation()
	{
		return this.__api.getProjectLocation();
	}

	getClientEmail()
	{
		return this.__api.getClientEmail();
	}

	getPrivateKey()
	{
		return this.__api.getPrivateKey();
	}

	getMapKey()
	{
		return this.__api.getMapKey();
	}

	getWebClient()
	{
		return this.__api.getWebClient();
	}

	isLocalEnv()
	{
		return this.__api.isLocalEnv();
	}



	getHost()
	{
		throw new Error("Abstract Method has no implementation");
	}

	getScope()
	{
		throw new Error("Abstract Method has no implementation");
	}	

	async 	queryGET(_endpoint, _returnFullResponse, _useAuthToken = true)
	{
		return await this.query(_endpoint, _returnFullResponse, QueryUtils.HTTP_METHOD_GET, null, _useAuthToken);
	}

	async 	queryPOST(_endpoint, _returnFullResponse, _body, _contentType = "application/json")
	{
		return await this.query(_endpoint, _returnFullResponse, QueryUtils.HTTP_METHOD_POST, _body, true, _contentType);
	}

	async 	queryPATCH(_endpoint, _returnFullResponse, _body)
	{
		return await this.query(_endpoint, _returnFullResponse, QueryUtils.HTTP_METHOD_PATCH, _body);
	}

	async 	queryDELETE(_endpoint, _returnFullResponse, _body = null)
	{
		return await this.query(_endpoint, _returnFullResponse, QueryUtils.HTTP_METHOD_DEL, _body);
	}

	async	query(_endpoint, _returnFullResponse, _method = "get", _body = null, _useAuthToken = true, _contentType = "application/json")
	{
		// prepare the query
		let	query = this.prepareQuery(_endpoint, _method, _body);

		// execute it
		return await this.__api.query(query, _returnFullResponse, _useAuthToken, _contentType);
	}

	prepareQuery(_endpoint, _method, _body)
	{
		// prepare the query
		let	query = {
			"service": this.getHost(),
			"scope": this.getScope(),
			"endpoint": _endpoint,
			"method": _method,
			"body": _body
		};

		return query;
	}

}

module.exports = {
	GCPAbstractService
};