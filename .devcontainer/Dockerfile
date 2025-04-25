FROM mcr.microsoft.com/devcontainers/base:noble

RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
        acl \
        bash-completion \
        build-essential \
        curl \
        docker.io \
        enchant-2 \
        gawk \
        gcc \
        genisoimage \
        gh \
        git \
        isomd5sum \
        libassuan-dev \
        libbtrfs-dev \
        libdevmapper-dev \
        libgdbm-dev \
        libgpgme-dev \
        libncursesw5-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev \
        libssl-dev libbz2-dev libreadline-dev libsqlite3-dev \
        make \
        npm \
        pkg-config \
        plantuml \
        shellcheck \
        tk-dev \
        tmux \
        vim \
        xz-utils \
        zlib1g-dev \
        && \
    apt-get clean

USER vscode

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# NOTE: Due to a bug in recent babel version, it cannot work with
# default UTC timezone
# See: https://github.com/python-babel/babel/issues/990
RUN sudo ln -fs /usr/share/zoneinfo/UTC /etc/localtime

ENV PYENV_ROOT="/usr/local/pyenv"
ENV PATH="$PYENV_ROOT/shims:$PYENV_ROOT/bin:$PATH"

# Install pyenv
RUN sudo git clone https://github.com/pyenv/pyenv.git $PYENV_ROOT && \
    sudo chown $(id -u):$(id -g) -R $PYENV_ROOT && \
    printf 'export PYENV_ROOT=%s\nexport PATH="$PYENV_ROOT/shims:$PYENV_ROOT/bin:$PATH"\nif command -v pyenv 1>/dev/null 2>&1; then\n eval "$(pyenv init -)"\nfi\n' $PYENV_ROOT | sudo tee -a /etc/bash.bashrc -a /etc/zsh/zshrc

# Install pythons
RUN pyenv install 3.10.12 3.6.15 2.7 && \
    pyenv global 3.10.12 3.6.15 2.7

# Install python libs
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3.6 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir "tox~=4.4.12" "pre-commit~=3.3.3" "virtualenv<20.22.0" "esbonio>=0.12.0" && \
    pip3.6 install --no-cache-dir "poetry~=1.1.15" && \
    pyenv rehash

# Install helm
ARG HELM_VERSION=3.17.2

RUN curl --fail -L -o /tmp/helm.tar.gz https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz && \
    sudo tar -zxvf /tmp/helm.tar.gz -C /usr/local/bin/ linux-amd64/helm --strip-components 1 && \
    rm -rf /tmp/helm.tar.gz

# Install go
ARG GO_VERSION=1.20.14
ENV GOROOT="/usr/local/go"
# NOTE: We use a custom GOPATH so that we can use it both for vscode and root users
ENV GOPATH="/usr/lib/go"
ENV GOBIN="$GOPATH/bin"
ENV PATH="$GOBIN:$GOROOT/bin:$PATH"

RUN curl --fail -L -o /tmp/go.tar.gz https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz && \
    sudo tar -C /usr/local/ -xzf /tmp/go.tar.gz && \
    sudo mkdir -p $GOPATH && \
    sudo chown $(id -u):$(id -g) -R $GOROOT $GOPATH && \
    cd $GOROOT/bin && mv go go${GO_VERSION} && ln -s go${GO_VERSION} go && \
    printf 'export PATH="%s:%s/bin:$PATH"\n' $GOBIN $GOROOT | sudo tee -a /etc/bash.bashrc -a /etc/zsh/zshrc && \
    rm -rf /tmp/go.tar.gz

# Install golangci-lint
ARG GOLANGCI_VERSION=1.54.2

RUN curl --fail -L -o /tmp/install.sh https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh && \
    sudo bash /tmp/install.sh v${GOLANGCI_VERSION} && \
    rm -f /tmp/install.sh

# Install crane
ARG CRANE_VERSION=0.20.3

RUN curl --fail -L -o /tmp/crane.tar.gz https://github.com/google/go-containerregistry/releases/download/v${CRANE_VERSION}/go-containerregistry_Linux_x86_64.tar.gz && \
    sudo tar -xzf /tmp/crane.tar.gz -C /usr/local/bin/ crane && \
    rm -rf /tmp/crane.tar.gz

# Install Skopeo from sources
ARG SKOPEO_VERSION=1.15.1

RUN curl --fail -L -o /tmp/skopeo.tar.gz https://github.com/containers/skopeo/archive/refs/tags/v${SKOPEO_VERSION}.tar.gz && \
    tar -zxvf /tmp/skopeo.tar.gz -C /tmp && \
    cd /tmp/skopeo-${SKOPEO_VERSION} && \
    sudo "PATH=$PATH" make bin/skopeo && \
    sudo mv bin/skopeo /usr/local/bin/ && \
    cd && \
    rm -rf /tmp/skopeo.tar.gz /tmp/skopeo-${SKOPEO_VERSION}

ARG CHANGIE_VERSION=1.21.1

RUN curl --fail -L -o /tmp/changie.deb https://github.com/miniscruff/changie/releases/download/v${CHANGIE_VERSION}/changie_${CHANGIE_VERSION}_linux_amd64.deb && \
    sudo dpkg -i /tmp/changie.deb && \
    rm -f /tmp/changie.deb
