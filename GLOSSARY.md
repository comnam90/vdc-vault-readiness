# VDC Vault Readiness

Checks whether a Veeam Backup & Replication environment, as described by a veeam-healthcheck export, is ready to send backups to Veeam Data Cloud Vault.

## Language

### Jobs

**Cloud plug-in job type**:
A JobType label for a Veeam Backup for AWS, Azure or Google Cloud policy, or the legacy raw `VmbApiPolicyTempJob` type. Excludes the Proxmox, AHV and Morpheus plug-ins.
_Avoid_: cloud job type, VMB API job

**Cloud-native job**:
A job with a cloud plug-in job type and no VBR repository; it writes to storage managed by the cloud appliance.
_Avoid_: cloud plug-in job (for this job-level meaning), repo-less job

**Ordinary job**:
Any job that isn't a cloud-native job, including a legacy `VmbApiPolicyTempJob` job that has a repository.
_Avoid_: standard job, normal job
