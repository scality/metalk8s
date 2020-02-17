FROM python:latest
RUN pip install requests
RUN pip install salt-pepper

ENV KUBE_LATEST_VERSION="v1.15.5"

RUN apt-get update \
 && apt-get install curl ca-certificates \
 && curl -L https://storage.googleapis.com/kubernetes-release/release/${KUBE_LATEST_VERSION}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl \
 && chmod +x /usr/local/bin/kubectl

RUN mkdir -p /apps/

COPY main.py /apps/
COPY run.sh /apps/


RUN ["chmod", "+x", "/apps/run.sh"]
ENTRYPOINT ["/apps/run.sh"]