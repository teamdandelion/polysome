# Polysome Overview

## Description

Polysome is an abstract biological exploration application. It uses a combination of modern web technologies to simulate and render complex biological processes.

## Technologies

### Main Technologies

- **React**: Used for building the outer website and managing the user interface.
- **p5.js**: Initially used for rendering, but being phased out in favor of native Canvas APIs.
- **Canvas API**: Used for rendering graphics directly to the HTML canvas.
- **Web Workers**: Used to offload simulation computations to a separate thread, improving performance and responsiveness.

### Build and Deployment

- **Parcel**: A fast, zero-configuration web application bundler used for building and serving the application.
- **Jest**: A testing framework used for running unit and performance tests.

## Architecture

### High-Level Structure

1. **User Interface (UI)**

   - Built with React.
   - Uses React Router for client-side routing.
   - Components include `Currents`, `LandingPage`, and others.

2. **Simulation**

   - Runs in a Web Worker to offload heavy computations from the main thread.
   - The `MoteSimulator` class handles the simulation logic.
   - Simulation data is transferred to the main thread using `postMessage` with transferable objects.

3. **Rendering**
   - Uses the Canvas API for rendering graphics.
   - The main thread receives simulation data from the Web Worker and renders it to the canvas.

### Data Flow

- **Initialization**: The main thread initializes the Web Worker with necessary data (e.g., simulation specifications, random number generator, flow field, bounds).
- **Simulation Step**: The main thread sends a message to the Web Worker to perform a simulation step.
- **Data Transfer**: The Web Worker performs the simulation step and sends the updated `Float32Array` of motes back to the main thread.
- **Rendering**: The main thread receives the updated motes and renders them to the canvas.

### Main Dependencies

- **React**: `^18.2.0`
- **React DOM**: `^18.2.0`
- **React Router DOM**: `^6.21.2`
- **p5.js**: `^1.9.0`
- **Parcel**: `^2.10.3`
- **Prettier**: `^3.1.0`
- **Jest**: `^29.7.0`
- **TypeScript**: (via `@types` packages)

## Future Enhancements

- Complete the transition from p5.js to native Canvas APIs.
- Add more detailed documentation for each component and module.
- Include diagrams to visualize the component hierarchy and data flow.
- Optimize performance further by refining the simulation and rendering logic.

## Conclusion

This document provides a high-level overview of the Polysome application's architecture. For more detailed information, refer to the individual component files and their respective documentation.
