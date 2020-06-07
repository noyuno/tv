#!/bin/bash
set -e

cryptsetup open /dev/mapper/hddsg0-crypt hddsg0-crypt-data
