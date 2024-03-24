/**
  ******************************************************************************
  * @file    HexorBot.c
  * @author  Tomas Hmiro
  * @version 0.01
  * @date    24.02.2024
  * @brief   Robot (HEXOR II) structs (objects) for UART communication hub.
  * 		 common defines of bool, and structures for better data exchange between "new" sensoric periphery, robot,
  * 		 and in time of creation two control inputs (antena - windows app, ESP - wifi server app)
  * @note	 This file is partial copy of STM_cube file some part are commented out and some are deleted
  ******************************************************************************
  * @attention
  *
  * all rights to this work are free under academic license.
  * More info at fm.tul.cz - Technical university of Liberec
  *
  ******************************************************************************
  *
  */

#include "HexorBot.h" 
const char startChar1 = '?', startChar2 = 's', endChar1 = '!', endChar2 = '&';

bot_response_t convertBytesToObject(uint8_t *bytes, bot_struct_t* b) {
	union {
		uint8_t raw[sizeof(bot_struct_t)];
		bot_struct_t bot;
	}data;

	uint8_t* pointer = (uint8_t *)&bytes[0];
	for (int i = 0; i < sizeof(bot_struct_t); i++) {
		data.raw[i] = *(pointer + i);
	}
	memcpy(b, &data.bot, sizeof(bot_struct_t));
	return WRITE_OK;
}

bot_response_t convertObjectToBytes(uint8_t *bytes, bot_struct_t *b) {
	union {
		uint8_t raw[sizeof(bot_struct_t)];
		bot_struct_t bot;
	}data;

	data.bot = *b;
	//bytes = &data.raw[0];
	//or if there is problem converting an pasting data then
	memcpy(bytes, &data.raw, sizeof(bot_struct_t));
}

bool startToEndRec(uint8_t* dataBytes, int* msgStartIdx) {
	int index = -1;
	*msgStartIdx = index;
	for (int i = 0; i < ROBOT_UART_MSG_SIZE; i++) {
		const char a = (char)*(dataBytes+i), b = (char)*(dataBytes + i+1);
		if (a == startChar1 && b == startChar2) {
			index = i+2;
		}
		if (a == endChar1 && b == endChar2 && index >= 0) {
			*msgStartIdx = index;
			return true;
		}
	}
	return false;
}
