FROM centos:7

# Prepare eve user and workspace
RUN adduser -u 1042 --home /home/eve eve \
    && mkdir -p /home/eve/workspace \
    && chown eve:eve /home/eve/workspace

# Install yum dependencies
RUN yum install -y epel-release \
    && yum install -y \
    curl \
    git \
    make \
    openssh \
    python-pip \
    sudo \
    unzip \
    && yum clean all

# Add eve to sudoers
RUN echo "eve ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/eve

# Install buildbot
ARG BUILDBOT_VERSION=0.9.12
RUN pip install buildbot-worker==${BUILDBOT_VERSION}


USER eve
WORKDIR /home/eve/workspace

# Generate SSH identity for Terraform
RUN mkdir -p /home/eve/.ssh/ \
    && ssh-keygen -t rsa -b 4096 -N '' -f /home/eve/.ssh/terraform

# Create user-local bin directory and add it to PATH
RUN mkdir -p /home/eve/.local/bin
ENV PATH /home/eve/.local/bin:$PATH

# Install Terraform in user-local bin
ARG TERRAFORM_VERSION=0.12.18
ARG TF_URL=https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}
ARG TF_FILE=terraform_${TERRAFORM_VERSION}_linux_amd64.zip

RUN curl \
    --retry 5 \
    -O "${TF_URL}/${TF_FILE}" \
    && unzip "${TF_FILE}" -d ~/.local/bin/ \
    && rm -f "${TF_FILE}" \
    && if ! terraform --version 2&> /dev/null; then \
          echo "aborting - terraform not installed and required" >&2; \
          exit 1; \
       fi
