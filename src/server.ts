import app from './app';
import config from './config/environment';

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`ODsay Proxy Server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});