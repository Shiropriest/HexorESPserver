/*
 Name:		HexorESPserver.ino
 Created:	02.11.2023 20:56:46
 Author:	Tomas Hmiro

 brief:		Program is dedicated to control HEXORII robot.
*/

/* ----------- includes --------------------*/
#include "HexorBot.h"
#include "esp_err.h"
#include "ESPAsyncWebServer.h"
#include "SPIFFS.h"
#include "string.h"
#include "WiFi.h"
#include "WiFiAP.h"
#include <AsyncTCP.h>
#include <math.h>
#include <SPI.h>
#include <Wire.h>
#include "driver/uart.h"
#include "communication.h"
#include "stdio.h"


/*--------------- defines ---------------*/
//i2c
#define SDA_PIN 21
#define SCL_PIN 22
#define I2C_FREQ 400000U

//accel
#define AVRG_FILTER_LEN 10

#define WIFI_MEM 20
#define BLINK_SLOW 10000
#define BLINK_FAST 1000
#define LED_BUILTIN 2


/*--------------- glob. variables ---------------*/
//web server
const char* ssid = "Hmirovi";
const char* pass = "VzduchovkaHMI";
String ssid_new, pass_new, ssid_old, pass_old, Wifis[WIFI_MEM];
int numberofAPsAround = 0;

//variables for state of program indicating LED
int blinkSpeed = 0;
bool ledState = false;
int stateLed = LED_BUILTIN;

//UART
#define UART_SPEED 250000
#define RX_BUF_SIZE 2048
#define UART_BUFF_SIZE RX_BUF_SIZE
#define TXD_PIN (GPIO_NUM_4)
#define RXD_PIN (GPIO_NUM_5)
#define SEND_TIME_OFFSET 10 //in ms
uint8_t dataToSend[RX_BUF_SIZE];// = "";
bool someDataRecievedFlag = false;
bool tryToRecieveData = false;
int lastIndex = 0;
int msgStartIdx = -1; //intentionaly index out of the array size

uint8_t dataBytes[UART_BUFF_SIZE]; //full buffer byte array
uint8_t recMsg[UART_BUFF_SIZE];

//testing
	int counter = 0;
	unsigned long tx_time = 0;
	unsigned long rx_time = 0;
	unsigned long last_rx = 0;
	unsigned long next_rx = 0;
	float f_rx_data[6];
	float f_rx_data1[6];
	int data_size = 0;

//i2c
/*
int i2cDevices[128];
int i2cDevCounter = 0;
*/

/*--------------- Map array def ---------------*/
#define mapSizeX 100
#define mapSizeY 100
String mapArray;
bool mapOfSurroundings[mapSizeX][mapSizeY];
bool mapIsSaved = false;

/*--------------- Robot's objects ---------------*/
bot_struct_t Hexor;
action operatorRights;
action modeChange;
action move;
action moveTail;

/*--------------- user defined web preproc. ---------------*/
//preprocesor for HTML page
IRAM_ATTR String proc(const String& var);
IRAM_ATTR String processor(const String& var);

String processor(const String& var) {	
	return String();
}
//preprocesor for JS scripts
String proc(const String& var) { 
	if (var == "ROS") {
		return " */ runningOnServer = true; /*";		
	}
	else if (var == "RS") {
		return "*//*";
	}
	else if (var == "MODE") {
		return "*/robotModeChange(mode1);/*";
	}
	return String();
}

bool mapToString() {
	//mapArray <= map
	if (!mapIsSaved) { return false; }	//there is no saved map (for now it is without EEPROM or SPIFFS saved map) so map is saved only while robot is running
	mapArray = ""; 
	bool _flagFreeMap = true;
	for (int r = 0; r < mapSizeY; r++) {//rows	
		for (int c = 0; c < mapSizeX; c++) {//colons	
			String _c = mapOfSurroundings[r][c] == true ? "1" : "0";
			mapArray += _c;
			if (_c == "1" && _flagFreeMap) {
				//to ensure that we dont send a message full of zeros (totaly useless)
				_flagFreeMap = false;
			}
		}
	}	
	mapIsSaved = !_flagFreeMap; //if the map is free there is literaly no map ... so map is not saved then..
	return !_flagFreeMap; //when the end is reached and the map is full of "0" return false so the map is not sended
}

/*-------------- UART functions ---------------------------*/

esp_err_t initUartComm(uart_port_t uart, int RX_pin, int TX_pin, int Baudrate, int bufferSize) {
	int _baudrate = Baudrate < 0 ? 115200 : Baudrate;
	uart_config_t uart_con;
	uart_con.baud_rate = _baudrate;
	uart_con.data_bits = UART_DATA_8_BITS;
	uart_con.parity = UART_PARITY_DISABLE;
	uart_con.stop_bits = UART_STOP_BITS_1;
	uart_con.flow_ctrl = UART_HW_FLOWCTRL_DISABLE;
	uart_con.rx_flow_ctrl_thresh = 0;
	uart_con.use_ref_tick = 1;

	// We won't use a buffer for sending data.
	esp_err_t err = ESP_OK;
	err = uart_param_config(uart, &uart_con) == ESP_OK ? err : ESP_FAIL;
	err = uart_set_pin(uart, TX_pin, RX_pin, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE) == ESP_OK ? err : ESP_FAIL;
	err = uart_driver_install(uart, bufferSize * 2, 0, 0, NULL, 0) == ESP_OK ? err : ESP_FAIL;
	
	//object init
	uint8_t* _p = (uint8_t *)&Hexor;
	for (int i = 0; i < sizeof(bot_struct_t); i++) {
		*(_p + i) = 0;
	}
	return err;
}

int sendData(const char* logName, uint8_t *data) {
	
	const char *c_data = (char *)data;
	const int len = sizeof(bot_struct_t);
	tx_time = micros();
	const int txBytes = uart_write_bytes(UART_NUM_1, c_data, len);
	ESP_LOGI(logName, "Wrote %d bytes", txBytes);
	return txBytes;
}

static void tx_task(void* arg) {
	static const char* TX_TASK_TAG = "TX_TASK";
	esp_log_level_set(TX_TASK_TAG, ESP_LOG_INFO);
	while (1) {
		sendData(TX_TASK_TAG, dataToSend);
		vTaskDelay(SEND_TIME_OFFSET / portTICK_PERIOD_MS);
	}
}

static void rx_task(void* arg) {
	static const char* RX_TASK_TAG = "RX_TASK";
	esp_log_level_set(RX_TASK_TAG, ESP_LOG_INFO);
	uint8_t* data = (uint8_t*)malloc(RX_BUF_SIZE);
	while (1) {
		const int rxBytes = uart_read_bytes(UART_NUM_1, data, RX_BUF_SIZE, 1000 / portTICK_PERIOD_MS);
		if (rxBytes > 0) {
			data[rxBytes] = 0;
			data_size = rxBytes;
			memcpy(&dataBytes[0+lastIndex], data, rxBytes);
			lastIndex += rxBytes;
			ESP_LOGI(RX_TASK_TAG, "Read %d bytes: '%s'", rxBytes, data);
			someDataRecievedFlag = true;
			rx_time = micros();
		}
	}
	free(data);
}



// the setup function runs once when you press reset or power the board
AsyncWebServer server(80);

void setup() {
	Serial.begin(115200);

	//actions objects init
	operatorRights.req = false;


	// Initialize SPIFFS
	if (!SPIFFS.begin()) {
		Serial.println("An Error has occurred while mounting SPIFFS");
		return;
	}
	else Serial.println("SPIFFS online");

	pinMode(2, OUTPUT);

	// Connect to Wi-Fi and setup softAP
	WiFi.mode(WIFI_AP_STA);
	WiFi.softAP("ESPWebServer", "HEXOR");
	delay(100);
	Serial.println("AP started");
	Serial.println(WiFi.softAPIP());

	for (int i = 0; i < 3; i++) {
		wl_status_t _t = connectTo(ssid, pass);		
		if (_t != WL_CONNECTED) {
			Serial.println("Trying to connect n.:" + (String)i + ", ended with error n.: " + (int)_t);
		}
		else break;
	}
	

	//Route to main page file 
	server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
		index(request);
		});

	// Route to load style.css file
	server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/style.css", "text/css");
		});

	// Route to load javascript files
	server.on("/mapScript.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/mapScript.js", "text/javascript", false, proc);
		});
	server.on("/mapFcnScript.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/mapFcnScript.js", "text/javascript");
		});
	server.on("/mapFcn1Script.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/mapFcn1Script.js", "text/javascript");
		});
	server.on("/mapFcn2Script.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/mapFcn2Script.js", "text/javascript");
		});
	server.on("/controlScript.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/controlScript.js", "text/javascript");
		});
	server.on("/pageScript.js", HTTP_GET, [](AsyncWebServerRequest* request) {
		request->send(SPIFFS, "/pageScript.js", "text/javascript");// , false, proc);
		});

	//Route to binary map array
	server.on("/map", HTTP_GET, [](AsyncWebServerRequest* request) {
		mapRequestHandle(request);		
		});

	server.on("/par", HTTP_GET, [](AsyncWebServerRequest* request) {
		parameterRequestHandle(request);
		});


	//UART - inside uartComm.ino file 
	if (initUartComm(UART_NUM_1, RXD_PIN, TXD_PIN, UART_SPEED, 512) != ESP_OK) {
		Serial.println("uart init fail!");
	} 

	//UART tasks (hopefully async and fast) 
	xTaskCreate(rx_task, "uart_rx_task", 1024 * 2, NULL, configMAX_PRIORITIES - 1, NULL);
	xTaskCreate(tx_task, "uart_tx_task", 1024 * 2, NULL, configMAX_PRIORITIES - 2, NULL);

	server.begin();
	delay(2000);
}

void mapRequestHandle(AsyncWebServerRequest* r) {
	bool _r = mapToString();
	int parameters = r->params();
	for (int i = 0; i < parameters; i++) {
		AsyncWebParameter* p = r->getParam(i);
		if (p->isFile()) {}
		else if (p->isPost()) {}
		else {
			if (p->name() == "save") {
				mapArray = p->value();
				mapIsSaved = true;
			}
		}
		if (_r) {
			r->send(200, "text/plain", mapArray);
		}
		else {
			r->send(200, "text/plain", "no_map");
		}

	}
}

void parameterRequestHandle(AsyncWebServerRequest* r) {
	int parameters = r->params();
	for (int i = 0; i < parameters; i++)
	{
		AsyncWebParameter* p = r->getParam(i);
		if (p->isFile()) Serial.printf("FILE[%s]: %s, size: %u\n", p->name().c_str(), p->value().c_str(), p->size());
		else if (p->isPost()) Serial.printf("POST[%s]: %s\n", p->name().c_str(), p->value().c_str());
		else {
			if (p->name() == "battery") {
				r->send(200, "text/plain", String(Hexor.batteryState));
			}
			else if (p->name() == "mode") {
				r->send(200, "text/plain", String(Hexor.mode));
			}
			else if (p->name() == "privilages") {
				r->send(200, "text/plain", String(Hexor.operator_n));
			}
			else if (p->name() == "position") {
				r->send(200, "text/plain", String(Hexor.position[0]) + ';' + String(Hexor.position[1]));
			}
			else if (p->name() == "WIFI") {
				String res = splitForWifi(String(p->value().c_str()));
				r->send(200, "text/plain", String(res));
			}
			else if (p->name() == "Connections") {		
				String _w;
				for (int i = 0; i < WIFI_MEM; i++) {
					if (Wifis[i] == "")break;
					_w += Wifis[i] + ";";
				}				
				r->send(200, "text/plain", _w);
			}
		}
	}
}

void index(AsyncWebServerRequest* r) {	
	//TODO add GET value reaction
	int parameters = r->params();
	for (int i = 0; i < parameters; i++)
	{
		AsyncWebParameter* p = r->getParam(i);
		if (p->isFile()) Serial.printf("FILE[%s]: %s, size: %u\n", p->name().c_str(), p->value().c_str(), p->size());
		else if (p->isPost()) Serial.printf("POST[%s]: %s\n", p->name().c_str(), p->value().c_str());
		else {
			if (p->name() == "robot") {
				int val = String(p->value().c_str()).toInt();
				
				operatorRights.req = true;
				if (val > stop && val <= back) {
					move.req = true;
					move.value = val;
				}
				else if (val <= mode4) {
					modeChange.req = true;
					modeChange.value = val;
				}
			}
			else if (p->name() == "tail") {
				int val = String(p->value().c_str()).toInt();
				operatorRights.req = true;
				if (val > stop && val <= back) {
					moveTail.value = val;
					moveTail.req = true;
				}
				else if (val <= mode4) {
					modeChange.req = true;
					modeChange.value = val;
				}
			}
			else if (p->name() == "actionEnd") {
				//buttons req stopped on event at webPage 
				//TODO add action timer cancelation
				move.req = moveTail.req = modeChange.req = false;
			}
			else if (p->name() == "reqOperator") {
				int val = String(p->value().c_str()).toInt();
				if (val == 1) {
					operatorRights.req = true;												
				}
				else if (val >= 2) {
					operatorRights.req = false;
				}
			}	
			else if (p->name() == "battery") {

			}
		}
	}
	return r->send(SPIFFS, "/index.html", String(), false, processor);
}

String splitForWifi(String msg) {
	String text;
	for (int i = 0; i < msg.length(); i++) {
		
		if (msg[i] == 'x' && msg[i + 1] == ';' && msg[i + 2] == 'x') {
			ssid_new = text;
			text = "";
		}
		else {
			text += msg[i];
		}		
	}
	pass_new = text;
	if ( connectTo(ssid_new.c_str(), pass_new.c_str()) == WL_CONNECTED) {
		ssid_old = ssid_new;
		pass_old = pass_new;
		return "Connected to" + ssid_new;
	}
	else if(ssid_old != "") {
		if (connectTo(ssid_old.c_str(), pass_old.c_str()) != WL_CONNECTED) {
			return "Cannot connect or reconnect back";
		}		
	}
	return "Reconnected back to " + ssid_old;
}

wl_status_t connectTo(const char* s, const char* p) {
	if ( _networksAround(s) ) {
		WiFi.begin(s, p);
		delay(100);
		Serial.print((String)"Connecting to " + ssid);
		for (int i = 0; i < 15; i++) {
			if (WiFi.status() == WL_CONNECTED) {
				Serial.println((String)"Connected to " + ssid);
				Serial.println((String)"With IP address: " + WiFi.localIP().toString());
				return WL_CONNECTED;
			}
			Serial.print(".");
			delay(1000);
		}
		if (WiFi.status() != WL_CONNECTED) {
			WiFi.disconnect();
			Serial.println("WiFi connection aborted after 10s");
			return WL_CONNECT_FAILED;
		}
		WiFi.disconnect();
	}	
	return WL_DISCONNECTED;
}

bool _networksAround(const char* SSID) {
	Serial.println("Scaning networks");
	if (WiFi.status() != WL_DISCONNECTED)WiFi.disconnect();
	delay(10);
	int n = WiFi.scanNetworks();

	if (n == 0) {
		Serial.println("no wifi found");
		WiFi.disconnect();
		return false;
	}
	else {
		Serial.print(n);
		Serial.println(" - networks found");
		for (int i = 0; i < n + 1; i++) {
			Wifis[i] = WiFi.SSID(i);
			Serial.println(WiFi.SSID(i));
			numberofAPsAround = n;
		}
	}
	
	for (int i = 0; i < numberofAPsAround + 1; i++) {

		if (Wifis[i] == SSID) {
			Serial.println("SSID confirmed");
			return true;
		}
	}
	return false;
}



// the loop function runs over and over again until power down or reset
void loop() { 
	
	if (someDataRecievedFlag) {	
	//on data receive	
		if (startToEndRec(&dataBytes[0], &msgStartIdx) && msgStartIdx >=0  && msgStartIdx <= RX_BUF_SIZE) {
			//if full msg is received and msg start index is within boundary
			memcpy(&recMsg[0], &dataBytes[msgStartIdx], sizeof(bot_struct_t));
			convertBytesToObject(&recMsg[0], &Hexor);
			//Serial.printf("after receive %d\n", lastIndex);
			lastIndex = 0;
		}
		
		someDataRecievedFlag = false;
		
	}
	/*
	Serial.println();
	Serial.printf("mode %d ,", Hexor.mode);
	Serial.println(dataBytes[0], BIN);
	Serial.printf("operator %d ,",Hexor.operator_n);
	Serial.println(dataBytes[1], BIN);
	Serial.printf("move %d\n", Hexor.move);
	Serial.printf("moveTail %d\n", Hexor.moveTail);
	//Serial.printf("numberOfScanAngles %d\n", Hexor.numberOfScanAngles);
	Serial.printf("mag0 %f\n", Hexor.mag[0]);
	Serial.printf("mag1 %f\n", Hexor.mag[1]);
	Serial.printf("mag2 %f\n", Hexor.mag[2]);
	Serial.printf("posx %d\n", Hexor.position[0]);
	Serial.printf("posy %d\n", Hexor.position[1]);
	Serial.printf("posr %d\n", Hexor.position[2]);
	Serial.printf("bateryState %d\n", Hexor.batteryState);
*/
	blinkSpeed = WiFi.status() == WL_CONNECTED ? BLINK_SLOW : BLINK_FAST;
	ledState = millis() % blinkSpeed > 1 && millis() % blinkSpeed < blinkSpeed/4 ? true : false;


	digitalWrite(stateLed, ledState);

	//operator logic, request to be if enabled by conditios than active if reqeust is taken down than the rights are passed to all
	operatorRights.en = Hexor.operator_n == DEFAULT_OP || Hexor.operator_n == SMART_DEV;
	operatorRights.act = operatorRights.req && operatorRights.en;
	Hexor.operator_n = operatorRights.act == true ? SMART_DEV : DEFAULT_OP;
	//if operator rights are enabled then the req still as it is else new req is needed
	operatorRights.req = operatorRights.en ? operatorRights.req : false;

	modeChange.en = operatorRights.act;
	move.en = operatorRights.act && !moveTail.req;
	moveTail.en = operatorRights.act && !move.req;

	//if this device is operator then the values of HEXOR object can be rewriten else leave thas as is.
	if (operatorRights.act) {
		Hexor.move = move.act ? move.value: STOP;
		Hexor.moveTail = moveTail.act ? moveTail.value : STOP;
	}

	convertObjectToBytes(&dataToSend[0], &Hexor);
}