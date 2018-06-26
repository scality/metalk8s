from centos:7

RUN yum install -y epel-release make gcc git && \
    yum install -y enchant \
                   python2-pip \
                   python-tox

RUN pip install buildbot-worker

COPY requirements.txt .
RUN pip2 install -r requirements.txt

ARG WORKDIR=/workdir
WORKDIR ${WORKDIR}
