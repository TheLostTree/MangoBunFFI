// example libpcap usage to list all devices 
import type {Pointer} from "bun:ffi";

import { ptr_to_data_view, read_value, type StructReadResult }from "./ffi/ffi_struct"
import {functions, libpcap} from "./ffi/libpcap";
const { pcap_if_t, pcap_pkthdr_def} = libpcap
const {
    symbols: {
        pcap_findalldevs,
        pcap_create,
        pcap_set_snaplen,
        pcap_set_promisc,
        pcap_set_buffer_size,
        pcap_set_timeout,
        pcap_activate,
        pcap_setnonblock,
        pcap_compile,
        pcap_setfilter,
        pcap_freecode,
        pcap_datalink,
        pcap_geterr,
        pcap_next_ex,
    },
} = functions;

function readUInt64Number(buffer: Buffer, offset: number){
    let num = buffer.readBigUint64LE(offset)
    if(num > Number.MAX_SAFE_INTEGER){
        throw new Error("Number too large: " + num)
    }
    return Number(num)
}

function findDevice(){
    let errBuf = Buffer.alloc(256)

    let pointer = Buffer.alloc(8)
    if (pcap_findalldevs(pointer, errBuf) == -1) {
        throw new Error("Error in pcap_findalldevs: " + errBuf.toString())
    }

    let devLocation = readUInt64Number(pointer, 0);
    // let allDevs = ptr_to_data_view(devLocation, 36)
    
    let devices = [];
    for(let pcapIf = read_value(devLocation, pcap_if_t).result; pcapIf.next != 0n; pcapIf = read_value(pcapIf.next, pcap_if_t).result){


        let flags = {
            LOOPBACK: false,
            UP: false,
            RUNNING: false,
            WIRELESS: false,
            CONNNECTION_STATUS: "UNKNOWN" as "UNKNOWN" | "CONNECTED" | "DISCONNECTED" | "NOT_APPLICABLE"
        }
        //ugliest bitmask parsing code ever btw
        for(let mask = 1; mask > (1 << 31); mask <<= 1){
            // console.log(mask.toString(2))
            switch(pcapIf.flags & mask){
                //0x1, 0x2, 0x4, 0x8, 0x1, 0x30, 0x00,0x10,0x20,0x30
                case 0x1:
                    flags.LOOPBACK = true
                    break;
                case 0x2:
                    flags.UP = true
                    break;
                case 0x4:
                    flags.RUNNING = true
                    break;
                case 0x8:
                    flags.WIRELESS = true
                    switch(pcapIf.flags & 0x30){
                        case 0x00:
                            flags.CONNNECTION_STATUS = "UNKNOWN"
                            break;
                        case 0x10:
                            flags.CONNNECTION_STATUS = "CONNECTED"
                            break;
                        case 0x20:
                            flags.CONNNECTION_STATUS = "DISCONNECTED"
                            break;
                        case 0x30:
                            flags.CONNNECTION_STATUS = "NOT_APPLICABLE"
                            break;
                    }
                    break;
            }
        }

        let device = {
            name: pcapIf.name,
            description: pcapIf.description.toString(),
            // addresses,  // didn't bother writing struct definitions as of yet
            flags
        };
        devices.push(device)
    }

    return devices
}

console.log(findDevice());