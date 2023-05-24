import { GCPAbstractService } from './GCPAbstractService';

import { StringUtils } from 'es4x-utils/src/utils/StringUtils';


class	GCPFCMService	extends GCPAbstractService
{
	static	get	API_VERSION()	{ return "v1";	}

	constructor(_googleAPI)
	{
		super(_googleAPI);
	}

	getHost()
	{
		return "fcm.googleapis.com";
	}

	getScope()
	{
		return "https://www.googleapis.com/auth/firebase.messaging";
	}	

	async	sendPushNotification(_fcmToken, _title, _body, _image = "", _data = null)
	{
		// build the notification payload
		let	notificationPayload = GCPFCMService.BuildPushNotificationPayload(_fcmToken, _title, _body, _image, _data);

		// prepare the endpoint
		let	fullEndpoint = "/" + GCPFCMService.API_VERSION + "/projects/" + this.getProjectId() + "/messages:send" ;

		// send the query
		return await this.queryPOST(fullEndpoint, false, notificationPayload);
	}

	static	BuildPushNotificationPayload(_fcmToken, _title, _body, _image = "", _data = null)
	{
		// create the notification content
		let	notificationPayload = {
			"message": {
				"token": _fcmToken,
				"notification": {
					"title": _title,
					"body": _body
				}
			}
		};

		// add data?
		if (_data != null)
			notificationPayload.message["data"] = _data;

		// add image?
		if (StringUtils.IsEmpty(_image) == false)
		{
			// ANDROID
			notificationPayload.message["android"] = {
				"notification": {
					"image": _image,
					"sound": "default"
				}
			};

			// iOS
			notificationPayload.message["apns"] = {
				"payload": {
					"aps": {
						"mutable-content": 1,
						"sound": "default"
					}
				},
				"fcm_options": {
					"image": _image
				}
			};			

			// web
			notificationPayload.message["webpush"] = {
				"headers": {
					"image": _image
				}
			};
		}

		return notificationPayload;
	}


}

module.exports = {
	GCPFCMService
};