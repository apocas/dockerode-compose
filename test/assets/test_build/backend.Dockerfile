FROM ubuntu

RUN \
  apt-get update && \
  apt-get install -y nginx && service nginx start

CMD ["bash"]