# Building the app

The Dockerfile is here to help you to generate the app's build folder.

## Usage

Run the following command in the docker folder :

```bash
cd .. \
&& docker build docker -f docker/Dockerfile.build -t gui-build \
&& docker run -v $(pwd):/home/node gui-build
```

## Next Step

Put something here explaining where to find the documentation to run the build.