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

			// get the result
			let	addressInfo = {};
			let	addressResult = ObjUtils.GetValue(contentJSON, "results[0]");

			// do we have something?
			if (CoreUtils.IsValid(addressResult) == true)
			{
				// full address
				addressInfo["value"] = ObjUtils.GetValueToString(contentJSON, "results[0].formatted_address");

				// lat / lon
				addressInfo["latitude"] = ObjUtils.GetValueToFloat(contentJSON, "results[0].geometry.location.lat");
				addressInfo["longitude"] = ObjUtils.GetValueToFloat(contentJSON, "results[0].geometry.location.lng");
				
				// components
				let	componentMapping = [
					{
						type: "country",
						long: "country",
						short: "country_code"
					},
					{
						type: "administrative_area_level_1",
						long: "aal1",
						short: ""
					},
					{
						type: "administrative_area_level_2",
						long: "aal2",
						short: ""
					},
					{
						type: "locality",
						long: "locality",
						short: ""
					},
					{
						type: "postal_code",
						long: "postal_code",
						short: ""
					},
					{
						type: "street_number",
						long: "street_number",
						short: ""
					},
					{
						type: "route",
						long: "route",
						short: ""
					},
				];
				for(let component of addressResult.address_components)
				{
					// test each mapping
					for(let mapping of componentMapping)
					{
						if (component.types.includes(mapping.type) == true)
						{
							// save them
							if (StringUtils.IsEmpty(mapping.long) == false)
								addressInfo[mapping.long] = component.long_name;
							if (StringUtils.IsEmpty(mapping.short) == false)
								addressInfo[mapping.short] = component.short_name;

							break;
						}
					}
				}

				// timezone?
			}

			return {
				statusCode: 200,
				result: addressInfo
			};
		}
	}
}

module.exports = {
	GCPMapService
};