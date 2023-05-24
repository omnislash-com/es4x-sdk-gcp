import { GCPAbstractService } from './GCPAbstractService';

import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';


class	GCPPubSubService	extends GCPAbstractService
{
	static	get	API_VERSION()	{ return "v1";	}

	constructor(_googleAPI)
	{
		super(_googleAPI);
	}

	getHost()
	{
		return "pubsub.googleapis.com";
	}

	getScope()
	{
		return "https://www.googleapis.com/auth/cloud-platform";
	}

	async	publishMessage(_topicId, _dataJson)
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
		let	endpoint = GCPPubSubService.GetTopicPath(this.getProjectId(), _topicId) + ":publish";
		let	fullEndpoint = "/" + GCPPubSubService.API_VERSION + "/" + endpoint;

		// send the query
		return await this.queryPOST(fullEndpoint, false, body);		
	}

	static	GetTopicPath(_project, _topicId)
	{
		return "projects/" + _project + "/topics/" + _topicId;
	}	

	static	ExtractPayload(_postData)
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
}

module.exports = {
	GCPPubSubService
};