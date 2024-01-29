/*
 Name:		HexorESPserver.ino
 Created:	02.11.2023 20:56:46
 Author:	Tomas Hmiro

 brief:		Program is dedicated to control HEXORII robot.
*/

/* ----------- includes --------------------*/
/*#include <WebResponseImpl.h>
#include <WebHandlerImpl.h>
#include <WebAuthentication.h>
#include <StringArray.h>
#include <SPIFFS.h>
#include <FS.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSynchronization.h>
#include <AsyncWebSocket.h>
#include <AsyncJson.h>
#include <ESPAsyncTCP.h>
#include <AsyncEventSource.h>
#include "WiFiAP.h"
#include "string.h"
#include "WiFi.h"
*/
#include <AsyncTCP.h>
//#include <FS.h>
#include "WiFi.h"
#include "ESPAsyncWebServer.h"
#include "SPIFFS.h"
#include "WiFiAP.h"
#include "string.h"
#include <math.h>
#include <Wire.h>
#include <SPI.h>
#include <esp32-hal-i2c.h>


/*--------------- defines ---------------*/
//i2c
#define SDA_PIN 21
#define SCL_PIN 22
#define I2C_FREQ 400000U

/*--------------- glob. variables ---------------*/
//web server
const char* ssid = "Hmirovi";
const char* pass = "VzduchovkaHMI";

//i2c
int i2cDevices[128];
int i2cDevCounter = 0;

/*--------------- Map array def ---------------*/
#define mapSizeX 100
#define mapSizeY 100
String mapArray;
bool map[mapSizeX][mapSizeY];


/*--------------- user defined web preproc. ---------------*/
//preprocesor for HTML page
String processor(const String& var) {	
	return String();
}
//preprocesor for JS scripts
String proc(const String& var) { 
	if (var == "ROS") {
		return "*/ runningOnServer = true; /*";
	}
	return String();
}

void mapToString() {
	//mapArray <= map
	mapArray = "";
	for (int r = 0; r < mapSizeY; r++)//rows
	{
		for (int c = 0; c < mapSizeX; c++)//colons
		{
			mapArray += map[r][c] == true ? "1" : "0";
		}
	}
}


// the setup function runs once when you press reset or power the board
AsyncWebServer server(80);

void setup() {
	Serial.begin(115200);
	// Initialize SPIFFS
	if (!SPIFFS.begin()) {
		Serial.println("An Error has occurred while mounting SPIFFS");
		return;
	}
	else Serial.println("SPIFFS online");

	// Connect to Wi-Fi and setup softAP
	WiFi.mode(WIFI_AP_STA);
	WiFi.softAP("ESPWebServer", "HEXOR");
	delay(100);
	Serial.println("AP started");
	Serial.println(WiFi.softAPIP());

	WiFi.begin(ssid, pass);
	delay(100);
	Serial.print((String)"Connecting to " + ssid);
	for (int i = 0; i < 10; i++) {
		if (WiFi.status() == WL_CONNECTED) {
			Serial.println((String)"Connected to " + ssid);
			Serial.println((String)"With IP address" + WiFi.localIP());
			break;
		}
		Serial.print(".");
		delay(1000);
	}
	if (WiFi.status() != WL_CONNECTED) {
		WiFi.disconnect();
		Serial.println("WiFi connection aborted after 10s");
	}

	server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
		request->send(SPIFFS, "/index.html", String(), false, processor);
		});
	// Route to load style.css file
	server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/style.css", "text/css");
		});
	// Route to load javascript file
	server.on("/contr.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/contr.js", "text/js");
		});
	server.on("/map.bmp", HTTP_GET, [](AsyncWebServerRequest* request) {
		AsyncWebServerResponse* response = request->beginResponse(SPIFFS, "/map.bmp", "image/png");
		response->addHeader("Access - Control - Allow - Origin", "*");
		request->send(response);
		});
	server.on("/map", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(200, "text/plain", mapArray);
		});



	//i2c startup unnecesary because it wont be there probably
	/*
		Wire.setPins(SDA_PIN, SCL_PIN);
		Wire.setClock(I2C_FREQ);
		if (!Wire.begin()) {
			Serial.println("I2C start error!");
		}
	*/


	server.begin();

	lookUpI2Cdevices();
}

void index(AsyncWebServerRequest* r) {
	return;
}

void lookUpI2Cdevices() {
	if (Wire.available()) {
		for (int i = 0; i++; i < 128) {
			Wire.beginTransmission(i);
			uint8_t error = Wire.endTransmission();
			if (error == 0) {
				i2cDevices[i2cDevCounter++] = i;
				Serial.print("device on 0x0");
				if (i < 16) {
					Serial.print("0");
				}
				Serial.println(i, HEX);
			}
			else if(error == 4) {
				Serial.print("error on 0x0");
				if (i < 16) {
					Serial.print("0");
				}
				Serial.println(i, HEX);
			}
		}
	}
}

// the loop function runs over and over again until power down or reset
void loop() {
	
}
