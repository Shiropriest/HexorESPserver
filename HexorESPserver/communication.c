/**
  ******************************************************************************
  * @file    communication.c
  * @author  Jan Kredba  * 
  * @edit&ConverForESP	Tomas Hmiro
  * @version 0.2
  * @date    28-April-2016
  * @brief   Communication support
  ******************************************************************************
  */


  /* Includes ------------------------------------------------------------------*/
#include "communication.h"
#include "stdint.h"	


/* Private typedef -----------------------------------------------------------*/

/* Private define ------------------------------------------------------------*/


/* Private macro -------------------------------------------------------------*/
/* Private variables ---------------------------------------------------------*/
static uint16_t packetID = 0;
static uint8_t hb12c_receiveBuffer[HB12_C_MAX_LENGTH] = { 0 };
static uint32_t hb12c_finishedStartIndex = 0;
static uint32_t hb12c_finishedLength = 0;
static uint32_t hb12c_receiveStartIndex = 0;
static uint32_t hb12c_receiveExpectedLength = 0;
static uint32_t hb12c_receiveCount = 0;
static uint8_t completeFrameReceived = 0;
/* Private function prototypes -----------------------------------------------*/
/* Private functions ---------------------------------------------------------*/
void hb12c_buildOutFrame(uint16_t command, uint8_t data[], uint32_t dataLength, uint16_t address, uint8_t out_frame[])
{
	int i;
	uint8_t checksum = 0;
	uint8_t outFrameLength = 12 + dataLength;
	out_frame[0] = (uint8_t)(outFrameLength & 0xFF);
	out_frame[1] = (uint8_t)((outFrameLength >> 8) & 0xFF);
	out_frame[2] = (uint8_t)((outFrameLength >> 16) & 0xFF);
	out_frame[3] = (uint8_t)((outFrameLength >> 24) & 0xFF);
	out_frame[4] = (uint8_t)(command & 0xFF);
	out_frame[5] = (uint8_t)((command >> 8) & 0xFF);
	out_frame[7] = 0;
	out_frame[8] = (uint8_t)(packetID & 0xFF);
	out_frame[9] = (uint8_t)((packetID >> 8) & 0xFF);
	out_frame[10] = (uint8_t)(address & 0xFF);
	out_frame[11] = (uint8_t)((address >> 8) & 0xFF);
	for (i = 0; i < dataLength; i++)
	{
		out_frame[i + 12] = data[i];
	}
	checksum = 0;
	for (i = 0; i < outFrameLength; i++)
	{
		checksum += out_frame[i];
	}
	out_frame[7] = checksum;
	packetID++;
}

void hb12c_buildAckFrame(uint16_t IDpacket, uint16_t address, uint8_t out_frame[])
{
	uint8_t ackPacketID[2];
	ackPacketID[0] = (uint8_t)(IDpacket & 0x00FF);
	ackPacketID[1] = (uint8_t)((IDpacket >> 8) & 0x00FF);
	hb12c_buildOutFrame(ACK_COMMAND, ackPacketID, 2, address, out_frame);
}

HB12C_Result_type hb12c_checkReceivedFrame(void)
{
	int i = 0;
	uint8_t frameChecksum = hb12c_receiveBuffer[(hb12c_receiveStartIndex + 7) % HB12_C_MAX_LENGTH];
	uint8_t calculatedChecksum = 0;
	for (i = 0; i < hb12c_receiveExpectedLength; i++)
	{
		if (i != 7) calculatedChecksum += hb12c_receiveBuffer[(hb12c_receiveStartIndex + i) % HB12_C_MAX_LENGTH];
	}
	if (calculatedChecksum != frameChecksum) return HB12C_CHECKSUM_ERROR;
	if (((uint16_t)hb12c_receiveBuffer[(hb12c_receiveStartIndex + 10) % HB12_C_MAX_LENGTH] + ((uint16_t)hb12c_receiveBuffer[(hb12c_receiveStartIndex + 11) % HB12_C_MAX_LENGTH]) * 256) != OWN_ADDRESS) return HB12C_ADDRESS_ERROR;
	return HB12C_OK;
}

HB12C_Result_type hb12c_checkReceivedData(void)
{
	if (hb12c_receiveCount > HB12_C_MAX_LENGTH) hb12c_receiveCount = 0;
	if (hb12c_receiveCount > 3 && hb12c_receiveExpectedLength == 0)
	{
		hb12c_receiveExpectedLength = (uint32_t)hb12c_receiveBuffer[(hb12c_receiveStartIndex) % HB12_C_MAX_LENGTH] + ((uint32_t)hb12c_receiveBuffer[(hb12c_receiveStartIndex + 1) % HB12_C_MAX_LENGTH]) * 256 + ((uint32_t)hb12c_receiveBuffer[(hb12c_receiveStartIndex + 2) % HB12_C_MAX_LENGTH]) * 65536 + ((uint32_t)hb12c_receiveBuffer[(hb12c_receiveStartIndex + 3) % HB12_C_MAX_LENGTH]) * 16777216;
		if (hb12c_receiveExpectedLength > HB12_C_MAX_LENGTH || hb12c_receiveExpectedLength < 12)
		{
			hb12c_receiveExpectedLength = 0;
			hb12c_receiveStartIndex = (hb12c_receiveStartIndex + 1) % HB12_C_MAX_LENGTH;
			hb12c_receiveCount--;
		}
	}
	if (hb12c_receiveCount >= hb12c_receiveExpectedLength && hb12c_receiveCount > 11)
	{
		HB12C_Result_type result = hb12c_checkReceivedFrame();
		if (result == HB12C_OK)
		{
			hb12c_finishedStartIndex = hb12c_receiveStartIndex;
			hb12c_finishedLength = hb12c_receiveExpectedLength;
			hb12c_receiveStartIndex = (hb12c_receiveStartIndex + hb12c_receiveExpectedLength) % HB12_C_MAX_LENGTH;
			hb12c_receiveCount -= hb12c_receiveExpectedLength;
			hb12c_receiveExpectedLength = 0;
			completeFrameReceived = 1;
			return HB12C_COMPLETED;
		}
		if (result == HB12C_CHECKSUM_ERROR)
		{
			hb12c_receiveExpectedLength = 0;
			hb12c_receiveStartIndex = (hb12c_receiveStartIndex + 1) % HB12_C_MAX_LENGTH;
			hb12c_receiveCount--;
			hb12c_checkReceivedData();
		}
	}
	return HB12C_NOT_COMPLETED;
}

void hb12c_addReceivedByte(uint8_t receivedByte)
{
	hb12c_receiveBuffer[(hb12c_receiveStartIndex + hb12c_receiveCount) % HB12_C_MAX_LENGTH] = receivedByte;
	hb12c_receiveCount++;
}

HB12C_Result_type hb12c_getReceivedPacket(Packet_structure* packet)
{
	if (completeFrameReceived)
	{
		int i;
		if (packet->dataLength < (hb12c_finishedLength - 12))
			return HB12C_ERROR;

		packet->ID = (uint16_t)hb12c_receiveBuffer[(hb12c_finishedStartIndex + 8) % HB12_C_MAX_LENGTH] + ((uint16_t)hb12c_receiveBuffer[(hb12c_finishedStartIndex + 9) % HB12_C_MAX_LENGTH]) * 256;
		packet->command = (uint16_t)hb12c_receiveBuffer[(hb12c_finishedStartIndex + 4) % HB12_C_MAX_LENGTH] + ((uint16_t)hb12c_receiveBuffer[(hb12c_finishedStartIndex + 5) % HB12_C_MAX_LENGTH]) * 256;
		packet->dataLength = hb12c_finishedLength - 12;
		for (i = 12; i < hb12c_finishedLength; i++)
		{
			*(packet->data + i - 12) = hb12c_receiveBuffer[(hb12c_finishedStartIndex + i) % HB12_C_MAX_LENGTH];
		}
		completeFrameReceived = 0;
		return HB12C_OK;
	}
	else return HB12C_ERROR;
}



