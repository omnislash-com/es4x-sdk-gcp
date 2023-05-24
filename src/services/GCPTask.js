import { GCPAbstractService } from './GCPAbstractService';

import { StringUtils } from 'es4x-utils/src/utils/StringUtils';
import { DateUtils } from 'es4x-utils/src/utils/DateUtils';
import { LogUtils } from 'es4x-utils/src/utils/LogUtils';


class	GCPTask	extends GCPAbstractService
{
	static	get	API_VERSION()	{ return "v2";	}

	constructor(_googleAPI)
	{
		super(_googleAPI);
	}

	getHost()
	{
		return "cloudtasks.googleapis.com";
	}

	getScope()
	{
		return "https://www.googleapis.com/auth/cloud-platform";
	}	

	async	create(_queue, _url, _method, _body, _delaySec = 0)
	{
		// prepare the body payload
		let	body = {
			"task": {
				"dispatchDeadline": "900s",	// 15min
				"httpRequest": {
					"url": _url,
					"httpMethod": _method,
					"body": StringUtils.StringToBase64(JSON.stringify(_body)),	// convert to base64
					"headers": {
						"Content-Type": "application/json"
					}
				}
			},
			"responseView": "BASIC"
		};

		// do we need to set a schedule time?
		if (_delaySec > 0)
		{
			body.task["scheduleTime"] = DateUtils.NowToZulu(_delaySec);
		}

		// prepare the endpoint
		let	endpoint = GCPTask.GetQueuePath(this.getProjectId(), this.getProjectLocation(), _queue) + "/tasks";
		let	fullEndpoint = "/" + GCPTask.API_VERSION + "/" + endpoint;

		// send the query
		let	ret = await this.queryPOST(fullEndpoint, false, body);

		LogUtils.Log("Creating Google Task result for " + _url + " / " + _method, {
			ret: ret,
			size: JSON.stringify(body).length
		});

		return ret;
	}

	static	GetQueuePath(_project, _location, _queue)
	{
		return "projects/" + _project + "/locations/" + _location + "/queues/" + _queue;
	}	
}

module.exports = {
	GCPTask
};