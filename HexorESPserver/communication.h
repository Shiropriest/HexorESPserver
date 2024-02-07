// communication.h

/**
  ******************************************************************************
  * @file    communication.h
  * @author  Jan Kredba
  * @edit&ConverForESP	Tomas Hmiro
  * @version 0.1
  * @date    28-April-2016
  * @brief   Header for communication.c module
  ******************************************************************************
  */

#ifndef _COMMUNICATION_h
#define _COMMUNICATION_h

#if defined(ARDUINO) && ARDUINO >= 100
	#include "arduino.h"
#else
	#include "WProgram.h"
#endif

#include "stdint.h"

  /* Exported types ------------------------------------------------------------*/
typedef enum __Result_types {
	HB12C_OK = 0,
	HB12C_CHECKSUM_ERROR,
	HB12C_ADDRESS_ERROR,
	HB12C_NOT_COMPLETED,
	HB12C_COMPLETED,
	HB12C_ERROR
} HB12C_Result_type;

typedef struct __packet {
	uint16_t ID;
	uint16_t command;
	uint8_t* data;
	uint32_t dataLength;
} Packet_structure;

/* Exported constants --------------------------------------------------------*/

#define HB12_C_MAX_LENGTH 256
#define OWN_ADDRESS 200
#define USB_CLIENT_ADDRESS 100
#define ACK_COMMAND 0x100

/* Exported macro ------------------------------------------------------------*/
/* Exported functions ------------------------------------------------------- */
void hb12c_buildOutFrame(uint16_t command, uint8_t data[], uint32_t dataLength, uint16_t address, uint8_t out_frame[]);
void hb12c_buildAckFrame(uint16_t IDpacket, uint16_t address, uint8_t out_frame[]);
void hb12c_addReceivedByte(uint8_t receivedByte);
HB12C_Result_type hb12c_checkReceivedData(void);
HB12C_Result_type hb12c_getReceivedPacket(Packet_structure* packet);


#endif /*_COMMUNICATION_h*/

