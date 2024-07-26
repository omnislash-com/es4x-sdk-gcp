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
		console.log("geocode: " + _address);
		return null;
	}
}

module.exports = {
	GCPMapService
};