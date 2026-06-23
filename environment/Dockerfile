FROM public.ecr.aws/docker/library/node:22-bookworm-slim@sha256:f3a68cf41a855d227d1b0ab832bed9749469ef38cf4f58182fb8c893bc462383

RUN apt-get update && apt-get install -y --no-install-recommends \
        tmux \
        python3 \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages \
    pytest==8.4.1 \
    pytest-json-ctrf==0.3.5 \
    jsonschema==4.23.0

COPY app/package.json /app/package.json
RUN cd /app && npm install --omit=dev

COPY app/ /app/

WORKDIR /app
