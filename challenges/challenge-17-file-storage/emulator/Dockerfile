# AWS Emulator, installed from the official Linux package (free, no account).
# uname -m prints x86_64 or aarch64, which is how the packages are named,
# so the same file builds on Intel/AMD and on Apple silicon.
FROM public.ecr.aws/amazonlinux/amazonlinux:2023-minimal
ARG EMULATOR_VERSION=1.0.337
RUN rpm -i --nosignature \
      "https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/aws-emulator-${EMULATOR_VERSION}-1-$(uname -m).rpm" \
    && mkdir -p /home/emulator/.aws/emulator \
    && chown -R 1000 /home/emulator
USER 1000
ENV HOME=/home/emulator
EXPOSE 9317
ENTRYPOINT ["aws-emulator", "-b", "0.0.0.0"]
