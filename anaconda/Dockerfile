FROM continuumio/anaconda3
RUN conda install -y jupyterlab conda-forge::nodejs
CMD /bib/bash
ENTRYPOINT jupyter-lab --allow-root --ip=0.0.0.0 --port=8888 --no-browser --NotebookApp.token='' --notebook-dir=/workspace
EXPOSE 8888
