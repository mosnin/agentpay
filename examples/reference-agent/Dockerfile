# Build from the repository root; handler uses only Node built-ins.
FROM node:22-alpine
WORKDIR /service
COPY --chown=node:node examples/reference-agent/agent.mjs examples/reference-agent/data-quality.mjs ./
USER node
ENV BIDS_HANDLER_PATH=/service/data-quality.mjs
CMD ["node", "agent.mjs"]
