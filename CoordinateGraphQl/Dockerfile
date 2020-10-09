FROM node:12
LABEL description="Instant high-performance GraphQL API for your PostgreSQL database https://github.com/graphile/postgraphile"
WORKDIR /home/coordinategraphql
# Install PostGraphile and PostGraphile connection filter plugin
RUN npm install -g postgraphile@4.9.0
RUN npm install -g @graphile-contrib/pg-simplify-inflector@6.0.0
RUN npm install -g postgraphile-plugin-connection-filter@2.0.0

# Install custom plugin
# COPY ./custom-plugin /tmp/custom-plugin
# RUN cd /tmp/custom-plugin && npm pack
# RUN npm install -g /tmp/custom-plugin/custom-plugin-0.0.1.tgz
# RUN rm -rf /tmp/custom-plugin
ADD ./startup.sh .
ADD ./wait-for-it.sh .
RUN ls
RUN chmod 755 wait-for-it.sh
RUN chmod 755 startup.sh
EXPOSE 4040
CMD  ./wait-for-it.sh ${DB_SERVER}:${DB_PORT} --strict --timeout=300 -- ./startup.sh
