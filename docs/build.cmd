#!/bin/bash -eE
:<<"::batch"
@echo off
.\docs\make.bat %*
goto :end
::batch
make -C docs $*
exit $?
:<<"::done"
:end
::done
