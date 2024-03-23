/**
  ******************************************************************************
  * @file    HexorBot.h
  * @author  Tomas Hmiro
  * @version 0.01
  * @date    24.02.2024
  * @brief   Robot (HEXOR II) structs (objects) for UART communication hub.
  * 		 common defines of bool, and structures for better data exchange between "new" sensoric periphery, robot,
  * 		 and in time of creation two control inputs (antena - windows app, ESP - wifi server app)
  *	@note	 This is partial copy from STM_Cube so some parts are commented out and only some functions are used.
  *			 Some parts are rewrited and some added.
  ******************************************************************************
  * @attention
  *
  * all rights to this work are free under academic license.
  * More info at fm.tul.cz - Technical university of Liberec
  *
  ******************************************************************************
  *
  */

#ifndef _HEXORBOT_h
#define _HEXORBOT_h

#if defined(ARDUINO) && ARDUINO >= 100
	#include "arduino.h"
#else
	#include "WProgram.h"
#endif


#ifdef __cplusplus
extern "C" {
#endif

/* Includes ------------------------------------------------------------------*/
//#include "stm32f7xx_hal.h" 
#include "communication.h"
#include "string.h"
#include <stdio.h>

//STM part
//creating a boolen type -> bool (takes memory space same as char (8bits) but have only two values (must be set to one of it)
//typedef enum {
//	FALSE,TRUE
//}bool;
//#define true 1U
//#define True 1U
//#define TRUE 1U
//#define false 0U
//#define False 0U
//#define FALSE 0U

//other defines
#define ROBOT_UART_MSG_SIZE 2048
#define PATH_LENGTH 300

//HEXORS modes based on the previous control application
	typedef enum { //__modes_t
		MODE_MANUAL = 0,   //default (I hope)
		MODE_SEMI_AUTO,			// = (0x1U)
		MODE_AUTO,				// = (0x2U)
		MODE_PRESENTATION, // = (0x3U) //I have no clue how (if really) it works but i'll leave it there
		MODE_PREPROG,
		MODE_AUTO2
	}robot_modes;


	//priorities of senders (feel free to add if you need some)
	typedef enum { //
		SENDER_LOWEST_PRIORITY = (0x0U),
		SENDER_DEFAULT,	// = (0x1U)
		SENDER_SEC,		// = (0x2U)
		SENDER_MAIN, 	// = (0x3U)
	}priority_t; //

	//used only inside STM 
	typedef enum {
		PC_ANTHENA = (0x0U),
		ESP_SMART_DEVICE,
		SENSOR_COMM,
		CONTROL_UNIT, //Control unit of robot
		NUMBER_OF_UART_OBJECTS_USED
	}bot_struct_index_t;

	typedef enum {
		DEFAULT_OP = 0,
		PC,
		SMART_DEV
	}bot_operator_t;

	typedef enum { //
		SENS_LONG_DIST_ULTRASONIC = (0x0U),
		SENS_UV_FRONT,
		SENS_UV_REAR,
		SENS_MECHANICAL_LEFT,
		SENS_MECHANICAL_RIGHT,
		SENS_MAX_NUMBER
	}sensor_t;

	typedef enum {
		stop = 0,
		forward,
		left,
		right,
		back,
		mode1,
		mode2,
		mode3,
		mode4,
	};

	typedef struct {
		bool pending; 	//for any error that occurs that is not acknowledged
		bool ack; 		//if error is acknowledged from somewhere
		bool ongoing; 	//still active error
		uint32_t *errorNum; //if there is any internal code for the error it can be paste here;
		//possibility to change to global error status type
		//uint8_t *errorSource[]; //possibly string of error source
	}alarmError;

	typedef struct {
		uint8_t ID;
		uint16_t command;
		uint32_t lenght;
		uint16_t controlSum; //CRC
		uint8_t data[ROBOT_UART_MSG_SIZE];
		uint8_t rawBuffer[ROBOT_UART_MSG_SIZE];
	}transmition;

	typedef struct {
		//default communication setting
		uint8_t mode;						// default = MODE_MANUAL
		uint8_t operator_n;			//priority of sender/object
		bool changeInPosition; 		//if the position changes set this to true
		bool changeInRecData; 		//if DMA receive data set to true
		bool mainOperatorActive; 		//first communication with main operator input (win app in default) sets this to true
		bool changeToOtherOperatorInputs; 	//until changed by first communication with any operator set to true than it locks to false than only sec input is able to operate robot (info is unlocked all the time)
		bool mainOperatorTimeout;
		int timeToUnlockOperatorInput; //time in milliseconds until last command from main operator, after this time the change is unlocked

		//TODO timer to unlock operator input change outside this struct

		//commands
		uint8_t move;
		uint8_t moveTail;
		uint8_t numberOfScanAngles; //MAX 32

		//robot's states in space
		float mag[3]; 		//I believe its in radians but lets see ( but then why it has sign (+- one pi to make 2pi circle? possibly) ¯\_(ツ)_/¯ )
		float magDeg[3]; 	//rotation about z,y,x axis of IMU in degrees
		uint16_t position[3]; 	//x,y, rot
		int setSpeed; 		//speed set in perc.
		int destPoint[3];
		bool recalcPath;
		int path[PATH_LENGTH];  	//I hope thats enough maybe adjust later
		int pathPointsOfInterest[50]; // -||- same for this vector
		int vectorToNextPoint[3];
		int vectorToGoal[3];

		//data from sensors
		uint8_t obstatecleMeasurementCount; //count of measurements done
		uint8_t obstacleDistances[32];
		int obstaclePositionAngle[3];
		int obstaclePositionDistance;
		uint8_t batteryState; //battery state in perc.
		uint16_t batteryVoltage;
		uint16_t batteryCurrent;

		uint16_t sensors; //tactile sensors. IR sensors
		// [ 1 IR sensors | 0 xxxxxxRL]

		//tail
		int tailAngleZ; //rotation around Z (yaw)
		int	tailAngleY; //rotation around Y (pitch)

	}bot_struct_t;

	//STM part -> ESP we transfer full bot_struct_data and on receive we directly pushed them into online object so no need for this
	//typedef struct {
	//Communication = UART if else feel free to 	
	//  UART_HandleTypeDef *huart; //insert the UART instance that is inicialized and set by CubeIDE	
	//	uint8_t connectedDevice; //to know which device is connected to this UART object
	//	transmition recievedData;
	//	transmition toSendData;
	//	//DMA handles of UART
	//	DMA_HandleTypeDef *rxDMA;		//insert the appropriate DMA handles for UART under this;
	//	DMA_HandleTypeDef *txDMA;
	//}bot_uart_struct_t;

	typedef enum __bot_response_t {
		WRITE_OK = (0x00U),
		WRITE_OK_LOW_PRIVILAGE,
		WRITE_MAIN_OP_SET,
		WRITE_ERROR_WITH_LOW_PRIVILAGE,
		WRITE_ERROR_NO_DEST,
		WRITE_ERROR_NO_SOURSE,
		ERROR_NO_CHANGES,
		BOT_ERROR
	}bot_response_t;

	//basic action logic for ESP -> little stealing from Benteler all credits to @RADEK PUJMAN
	typedef struct {
		bool req; //request to do something
		bool en;  //is activating enable? 
		bool act; //the action is active
		uint8_t value;
	}action;


	bot_response_t convertBytesToObject(uint8_t* bytes, bot_struct_t* b);
	bot_response_t convertObjectToBytes(uint8_t* bytes, bot_struct_t* b);
	bool startToEndRec(uint8_t* dataBytes, int *msgStartIdx);

#ifdef __cplusplus
}
#endif

#endif /* __HEXOR_BOT_H */


