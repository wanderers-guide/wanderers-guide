#!/bin/bash

# Install Node.js and npm
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
yum install -y nodejs

# Install Git
yum install -y git
