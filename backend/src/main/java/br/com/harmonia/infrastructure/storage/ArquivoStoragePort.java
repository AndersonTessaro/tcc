package br.com.harmonia.infrastructure.storage;

public interface ArquivoStoragePort {
    /** Salva bytes e devolve o storage_path. */
    String salvar(String nomeArquivo, byte[] conteudo);
    byte[] ler(String storagePath);
}
