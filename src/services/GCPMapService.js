import { GCPAbstractService } from './GCPAbstractService';

import { ObjUtils } from 'es4x-utils/src/utils/ObjUtils';
import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';
import { CoreUtils } from 'es4x-utils/src/utils/CoreUtils';
import { ArrayUtils } from 'es4x-utils/src/utils/ArrayUtils';


class	GCPMapService	extends GCPAbstractService
{
	constructor(_googleAPI)
	{
		super(_googleAPI);
	}

	getHost()
	{
		return "maps.googleapis.com";
	}

	getScope()
	{
		return "https://www.googleapis.com/auth/cloud-platform";
	}	

	async	geocode(_address)
	{
		let	key = this.getMapKey();
		let	endpoint = "/maps/api/geocode/json?address=" + encodeURIComponent(_address) + "&key=" + key;

		console.log("geocode: " + _address);
		console.log("Endpoint = " + endpoint);

 		let	ret = await this.queryGET(endpoint, true, false);

		// error code?
		let	errorCodeQuery = ObjUtils.GetValueToInt(ret, "statusCode");
		if (errorCodeQuery != 200)
		{
			return {
				statusCode: errorCodeQuery,
				result: {}
			};
		}
		else
		{
			// parse the content
			let	contentStr = ObjUtils.GetValue(ret, "content", "");
			let	contentJSON = JSON.parse(contentStr);

			return {
				statusCode: 200,
				result: contentJSON
			};
		}
	}
}

module.exports = {
	GCPMapService
};