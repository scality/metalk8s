# Running the app

The Dockerfile is here to help you to generate the image that run the app.

## Usage

Run the following command in the docker folder :

```bash
cd .. \
&& docker build docker -f docker/Dockerfile.run -t gui-run \
&& docker run --rm -it -p 8080:80 -v $(pwd)/override-brand:/usr/share/nginx/html/sup:z gui-run bash
```

The app should now be running on your `http://localhost:8080`