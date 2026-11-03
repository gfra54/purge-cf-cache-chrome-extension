/* eslint-disable no-undef */
import Api from './api.js';
import './cacheStatus.js';

// An Error does not survive the message channel (it arrives as an empty object),
// so every failure is flattened to a readable string before it is sent back.
const errorMessage = error => (error && error.message ? error.message : String(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const {
        rSettings,
        rDomain,
        rZoneId,
        rPurgeSettings,
        rDevModeState,
    } = request;
    const api = new Api((rSettings || {}).email, (rSettings || {}).key, (rSettings || {}).token);
    const response = {
        result: null,
        error: null
    }
    switch (request.type) {
    case 'getZoneId':
        api.getZoneId(rDomain).then((zoneId) => {
            response.result = zoneId;
            return sendResponse(response);
        }).catch(error => {
            response.error = errorMessage(error);
            return sendResponse(response);
        });
        break;
    case 'getZones':
        api.getZones().then((zones) => {
            response.result = zones;
            return sendResponse(response);
        }).catch(error => {
            response.error = error.message;
            return sendResponse(response);
        });
        break;
    case 'purgeCache':
        api.purgeCache(rPurgeSettings, rZoneId).then((rayId) => {
            response.result = rayId;
            return sendResponse(response);
        }).catch(error => {
            response.error = errorMessage(error);
            sendResponse(response);
        });
        break;
    case 'getZoneDevelopmentMode':
        api.getZoneDevelopmentMode(rZoneId).then((zoneDevelopmentMode) => {
            response.result = zoneDevelopmentMode;
            return sendResponse(response);
        }).catch(error => {
            response.error = errorMessage(error);
            sendResponse(response);
        });
        break;
    case 'setZoneDevelopmentMode':
        api.setZoneDevelopmentMode(rZoneId, rDevModeState)
            .then(() => sendResponse(response))
            .catch(error => {
                response.error = errorMessage(error);
                return sendResponse(response);
            });
        break;
    default:
        sendResponse({ result: null, error: `Unknown request: ${request.type}` });
        break;
    }

    return true;
});
