import macro from 'vtk.js/Sources/macro';
import vtkImageCroppingRegionsWidget from 'vtk.js/Sources/Interaction/Widgets/ImageCroppingRegionsWidget';

import getContrastSensitiveStyle from './getContrastSensitiveStyle';

import style from './ItkVtkImageViewer.mcss';

import toggleIcon from './icons/toggle.svg';
import screenshotIcon from './icons/screenshot.svg';
import volumeRenderingIcon from './icons/volume-rendering.svg';
import xPlaneIcon from './icons/x-plane.svg';
import yPlaneIcon from './icons/y-plane.svg';
import zPlaneIcon from './icons/z-plane.svg';
import annotationIcon from './icons/annotations.svg';
import interpolationIcon from './icons/interpolation.svg';
import cropIcon from './icons/crop.svg';
import resetCropIcon from './icons/reset-crop.svg';
import resetCameraIcon from './icons/reset-camera.svg';

function createMainUI(
  rootContainer,
  viewerDOMId,
  isBackgroundDark,
  use2D,
  imageSource,
  representation,
  view
) {
  const uiContainer = document.createElement('div');
  rootContainer.appendChild(uiContainer);
  uiContainer.setAttribute('class', style.uiContainer);

  const contrastSensitiveStyle = getContrastSensitiveStyle(
    ['invertibleButton', 'tooltipButton'],
    isBackgroundDark
  );

  const mainUIGroup = document.createElement('div');
  mainUIGroup.setAttribute('class', style.uiGroup);

  const mainUIRow = document.createElement('div');
  mainUIRow.setAttribute('class', style.mainUIRow);
  mainUIRow.className += ` ${viewerDOMId}-toggle`;
  mainUIGroup.appendChild(mainUIRow);

  const toggleUserInterfaceButton = document.createElement('div');
  function toggleUIVisibility() {
    const elements = uiContainer.querySelectorAll(`.${viewerDOMId}-toggle`);
    let count = elements.length;
    const collapsed =
      toggleUserInterfaceButton.getAttribute('collapsed') === '';
    if (collapsed) {
      while (count--) {
        elements[count].style.display = 'flex';
      }
      toggleUserInterfaceButton.removeAttribute('collapsed');
    } else {
      while (count--) {
        elements[count].style.display = 'none';
      }
      toggleUserInterfaceButton.setAttribute('collapsed', '');
    }
  }
  toggleUserInterfaceButton.className = `${
    contrastSensitiveStyle.invertibleButton
  } ${style.toggleUserInterfaceButton}`;
  toggleUserInterfaceButton.id = `${viewerDOMId}-toggleUserInterfaceButton`;
  toggleUserInterfaceButton.innerHTML = `${toggleIcon}`;
  toggleUserInterfaceButton.addEventListener('click', toggleUIVisibility);
  uiContainer.appendChild(toggleUserInterfaceButton);

  const screenshotButton = document.createElement('div');
  screenshotButton.innerHTML = `<div itk-vtk-tooltip itk-vtk-tooltip-top-screenshot itk-vtk-tooltip-content="Screenshot" class="${
    contrastSensitiveStyle.invertibleButton
  } ${style.screenshotButton}">${screenshotIcon}</div>`;
  function takeScreenshot() {
    view.openCaptureImage();
  }
  screenshotButton.addEventListener('click', takeScreenshot);
  mainUIRow.appendChild(screenshotButton);

  const annotationButton = document.createElement('div');
  annotationButton.innerHTML = `<input id="${viewerDOMId}-toggleAnnotationsButton" type="checkbox" class="${
    style.toggleInput
  }" checked><label itk-vtk-tooltip itk-vtk-tooltip-top-annotation itk-vtk-tooltip-content="Annotations" class="${
    contrastSensitiveStyle.invertibleButton
  } ${style.annotationButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-toggleAnnotationsButton">${annotationIcon}</label>`;
  const annotationButtonInput = annotationButton.children[0];
  function toggleAnnotations() {
    const annotationEnabled = annotationButtonInput.checked;
    view.setOrientationAnnotationVisibility(annotationEnabled);
  }
  annotationButton.addEventListener('change', (event) => {
    toggleAnnotations();
  });
  mainUIRow.appendChild(annotationButton);

  let interpolationEnabled = true;
  function toggleInterpolation() {
    interpolationEnabled = !interpolationEnabled;
    view.setPlanesUseLinearInterpolation(interpolationEnabled);
  }
  const interpolationButton = document.createElement('div');
  interpolationButton.innerHTML = `<input id="${viewerDOMId}-toggleInterpolationButton" type="checkbox" class="${
    style.toggleInput
  }" checked><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Interpolation" class="${
    contrastSensitiveStyle.invertibleButton
  } ${style.interpolationButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-toggleInterpolationButton">${interpolationIcon}</label>`;
  interpolationButton.addEventListener('change', (event) => {
    toggleInterpolation();
  });
  mainUIRow.appendChild(interpolationButton);

  const croppingWidget = vtkImageCroppingRegionsWidget.newInstance();
  croppingWidget.setHandleSize(22);
  croppingWidget.setFaceHandlesEnabled(false);
  croppingWidget.setEdgeHandlesEnabled(false);
  croppingWidget.setCornerHandlesEnabled(true);
  croppingWidget.setInteractor(view.getInteractor());
  croppingWidget.setEnabled(false);
  if (representation) {
    croppingWidget.setVolumeMapper(representation.getMapper());
  }
  const croppingPlanesChangedHandlers = [];
  const addCroppingPlanesChangedHandler = (handler) => {
    const index = croppingPlanesChangedHandlers.length;
    croppingPlanesChangedHandlers.push(handler);
    function unsubscribe() {
      croppingPlanesChangedHandlers[index] = null;
    }
    return Object.freeze({ unsubscribe });
  };
  let croppingUpdateInProgress = false;
  const setCroppingPlanes = () => {
    if (croppingUpdateInProgress) {
      return;
    }
    croppingUpdateInProgress = true;
    const planes = croppingWidget.getWidgetState().planes;
    representation.setCroppingPlanes(planes);
    const bboxCorners = croppingWidget.planesToBBoxCorners(planes);
    croppingPlanesChangedHandlers.forEach((handler) => {
      handler.call(null, planes, bboxCorners);
    });
    croppingUpdateInProgress = false;
  };
  const debouncedSetCroppingPlanes = macro.debounce(setCroppingPlanes, 100);
  croppingWidget.onModified(debouncedSetCroppingPlanes);
  let cropEnabled = false;
  function toggleCrop() {
    cropEnabled = !cropEnabled;
    croppingWidget.setEnabled(cropEnabled);
  }
  const cropButton = document.createElement('div');
  cropButton.innerHTML = `<input id="${viewerDOMId}-toggleCroppingPlanesButton" type="checkbox" class="${
    style.toggleInput
  }"><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Select ROI" class="${
    contrastSensitiveStyle.invertibleButton
  } ${style.cropButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-toggleCroppingPlanesButton">${cropIcon}</label>`;
  cropButton.addEventListener('change', (event) => {
    toggleCrop();
  });
  mainUIRow.appendChild(cropButton);

  const resetCropButton = document.createElement('div');
  resetCropButton.innerHTML = `<input id="${viewerDOMId}-resetCroppingPlanesButton" type="checkbox" class="${
    style.toggleInput
  }" checked><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Reset ROI" class="${
    contrastSensitiveStyle.invertibleButton
  } ${style.resetCropButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-resetCroppingPlanesButton">${resetCropIcon}</label>`;
  function resetCrop() {
    representation.getCropFilter().reset();
    croppingWidget.resetWidgetState();
  }
  resetCropButton.addEventListener('change', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetCrop();
  });
  resetCropButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetCrop();
  });
  mainUIRow.appendChild(resetCropButton);

  const resetCameraButton = document.createElement('div');
  resetCameraButton.innerHTML = `<input id="${viewerDOMId}-resetCameraButton" type="checkbox" class="${
    style.toggleInput
  }" checked><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Reset camera" class="${
    contrastSensitiveStyle.invertibleButton
  } ${style.resetCameraButton} ${
    style.toggleButton
  }" for="${viewerDOMId}-resetCameraButton">${resetCameraIcon}</label>`;
  function resetCamera() {
    view.resetCamera();
  }
  resetCameraButton.addEventListener('change', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetCamera();
  });
  resetCameraButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetCamera();
  });
  mainUIRow.appendChild(resetCameraButton);

  function setViewModeXPlane() {
    view.setViewMode('XPlane');
    document.getElementById(`${viewerDOMId}-xPlaneButton`).checked = true;
    document.getElementById(`${viewerDOMId}-yPlaneButton`).checked = false;
    document.getElementById(`${viewerDOMId}-zPlaneButton`).checked = false;
    document.getElementById(
      `${viewerDOMId}-volumeRenderingButton`
    ).checked = false;
    const volumeRenderingRow = uiContainer.querySelector(
      `.${viewerDOMId}-volumeRendering`
    );
    volumeRenderingRow.style.display = 'none';
    const xPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-x-plane-row`);
    xPlaneRow.style.display = 'flex';
    const yPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-y-plane-row`);
    yPlaneRow.style.display = 'none';
    const zPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-z-plane-row`);
    zPlaneRow.style.display = 'none';
  }
  function setViewModeYPlane() {
    view.setViewMode('YPlane');
    document.getElementById(`${viewerDOMId}-xPlaneButton`).checked = false;
    document.getElementById(`${viewerDOMId}-yPlaneButton`).checked = true;
    document.getElementById(`${viewerDOMId}-zPlaneButton`).checked = false;
    document.getElementById(
      `${viewerDOMId}-volumeRenderingButton`
    ).checked = false;
    const volumeRenderingRow = uiContainer.querySelector(
      `.${viewerDOMId}-volumeRendering`
    );
    volumeRenderingRow.style.display = 'none';
    const xPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-x-plane-row`);
    xPlaneRow.style.display = 'none';
    const yPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-y-plane-row`);
    yPlaneRow.style.display = 'flex';
    const zPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-z-plane-row`);
    zPlaneRow.style.display = 'none';
  }
  function setViewModeZPlane() {
    view.setViewMode('ZPlane');
    document.getElementById(`${viewerDOMId}-xPlaneButton`).checked = false;
    document.getElementById(`${viewerDOMId}-yPlaneButton`).checked = false;
    document.getElementById(`${viewerDOMId}-zPlaneButton`).checked = true;
    document.getElementById(
      `${viewerDOMId}-volumeRenderingButton`
    ).checked = false;
    const volumeRenderingRow = uiContainer.querySelector(
      `.${viewerDOMId}-volumeRendering`
    );
    volumeRenderingRow.style.display = 'none';
    const xPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-x-plane-row`);
    xPlaneRow.style.display = 'none';
    const yPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-y-plane-row`);
    yPlaneRow.style.display = 'none';
    const zPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-z-plane-row`);
    zPlaneRow.style.display = 'flex';
  }
  function setViewModeVolumeRendering() {
    view.setViewMode('VolumeRendering');
    document.getElementById(`${viewerDOMId}-xPlaneButton`).checked = false;
    document.getElementById(`${viewerDOMId}-yPlaneButton`).checked = false;
    document.getElementById(`${viewerDOMId}-zPlaneButton`).checked = false;
    document.getElementById(
      `${viewerDOMId}-volumeRenderingButton`
    ).checked = true;
    const volumeRenderingRow = uiContainer.querySelector(
      `.${viewerDOMId}-volumeRendering`
    );
    volumeRenderingRow.style.display = 'flex';
    const viewPlanes = document.getElementById(
      `${viewerDOMId}-toggleSlicingPlanesButton`
    ).checked;
    const xPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-x-plane-row`);
    const yPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-y-plane-row`);
    const zPlaneRow = uiContainer.querySelector(`.${viewerDOMId}-z-plane-row`);
    if (viewPlanes) {
      xPlaneRow.style.display = 'flex';
      yPlaneRow.style.display = 'flex';
      zPlaneRow.style.display = 'flex';
    } else {
      xPlaneRow.style.display = 'none';
      yPlaneRow.style.display = 'none';
      zPlaneRow.style.display = 'none';
    }
  }
  if (!use2D) {
    const xPlaneButton = document.createElement('div');
    xPlaneButton.innerHTML = `<input id="${viewerDOMId}-xPlaneButton" type="checkbox" class="${
      style.toggleInput
    }"><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="X plane" class="${
      contrastSensitiveStyle.tooltipButton
    } ${style.viewModeButton} ${
      style.toggleButton
    }" for="${viewerDOMId}-xPlaneButton">${xPlaneIcon}</label>`;
    xPlaneButton.addEventListener('click', setViewModeXPlane);
    mainUIRow.appendChild(xPlaneButton);

    const yPlaneButton = document.createElement('div');
    yPlaneButton.innerHTML = `<input id="${viewerDOMId}-yPlaneButton" type="checkbox" class="${
      style.toggleInput
    }"><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Y plane" class="${
      contrastSensitiveStyle.tooltipButton
    } ${style.viewModeButton} ${
      style.toggleButton
    }" for="${viewerDOMId}-yPlaneButton">${yPlaneIcon}</label>`;
    yPlaneButton.addEventListener('click', setViewModeYPlane);
    mainUIRow.appendChild(yPlaneButton);

    const zPlaneButton = document.createElement('div');
    zPlaneButton.innerHTML = `<input id="${viewerDOMId}-zPlaneButton" type="checkbox" class="${
      style.toggleInput
    }"><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Z plane" class="${
      contrastSensitiveStyle.tooltipButton
    } ${style.viewModeButton} ${
      style.toggleButton
    }" for="${viewerDOMId}-zPlaneButton">${zPlaneIcon}</label>`;
    zPlaneButton.addEventListener('click', setViewModeZPlane);
    mainUIRow.appendChild(zPlaneButton);

    const volumeRenderingButton = document.createElement('div');
    volumeRenderingButton.innerHTML = `<input id="${viewerDOMId}-volumeRenderingButton" type="checkbox" class="${
      style.toggleInput
    }" checked><label itk-vtk-tooltip itk-vtk-tooltip-top itk-vtk-tooltip-content="Volume" class="${
      contrastSensitiveStyle.tooltipButton
    } ${style.viewModeButton} ${
      style.toggleButton
    }" for="${viewerDOMId}-volumeRenderingButton">${volumeRenderingIcon}</label>`;
    volumeRenderingButton.addEventListener('click', setViewModeVolumeRendering);
    mainUIRow.appendChild(volumeRenderingButton);
  }

  uiContainer.appendChild(mainUIGroup);

  return { uiContainer, croppingWidget, addCroppingPlanesChangedHandler };
}

export default createMainUI;
