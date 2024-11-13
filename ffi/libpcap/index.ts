import {dlopen, FFIType, suffix} from "bun:ffi";

import * as libpcap_mac from "./libpcap_mac"
import * as libpcap_win from "./libpcap_win"
import os from "os"

let libname = suffix === "dll" ? "wpcap.dll" : "libpcap." + suffix;
let functions = dlopen(
    libname,
    {
        //int	pcap_findalldevs(pcap_if_t **, char *);
        pcap_findalldevs :{
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.cstring]
        },
        pcap_create: {
            returns: FFIType.pointer, // pcap_t*
            args: [FFIType.cstring, FFIType.cstring] // device, errbuf
        },
        pcap_set_snaplen: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int] // pcap_t*, snaplen
        },
        pcap_set_promisc: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int] // pcap_t*, promisc
        },
        pcap_set_buffer_size: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int] // pcap_t*, buffer_size
        },
        pcap_set_timeout: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int] // pcap_t*, timeout
        },
        pcap_activate: {
            returns: FFIType.int,
            args: [FFIType.pointer] // pcap_t*
        },
        pcap_setnonblock: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int, FFIType.char] // pcap_t*, nonblock, errbuf
        },
        pcap_compile: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.pointer, FFIType.cstring, FFIType.int, FFIType.int] // pcap_t*, bpf_program*, char*, int, bpf_u_int32
        },
        pcap_setfilter: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.pointer] // pcap_t*, bpf_program*
        },
        pcap_freecode: {
            returns: FFIType.void,
            args: [FFIType.pointer] // bpf_program*
        },
        pcap_datalink: {
            returns: FFIType.int,
            args: [FFIType.pointer] // pcap_t*
        },
        // pcap_getevent: {
        //     returns: FFIType.pointer,
        //     args: [FFIType.pointer] // pcap_t*
        // },
        pcap_geterr: {
            returns: FFIType.cstring,
            args: [FFIType.pointer] // pcap_t*
        },
        pcap_next_ex: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.pointer, FFIType.pointer] // pcap_t*, struct pcap_pkthdr**, const u_char**
        },
        pcap_dispatch: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int, FFIType.pointer, FFIType.pointer] // pcap_t*, int, pcap_handler, u_char*
        },
        pcap_open_live: {
            returns: FFIType.pointer,
            args: [FFIType.cstring, FFIType.int, FFIType.int, FFIType.int, FFIType.pointer] // device, snaplen, promisc, to_ms, errbuf
        },
        pcap_loop: {
            returns: FFIType.int,
            args: [FFIType.pointer, FFIType.int, FFIType.pointer, FFIType.pointer] // pcap_t*, int, pcap_handler, u_char*
        }
    },
);

console.log("loaded libpcap")


function getStructDefs(plat?:NodeJS.Platform){
    const platform = plat || os.platform()

    switch(platform){
        case "darwin":
            return libpcap_mac
        case "win32":
            return libpcap_win
    }

    return libpcap_win; //default
}

const libpcap = getStructDefs();
export {libpcap, functions}
